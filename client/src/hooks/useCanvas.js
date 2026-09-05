import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRoom } from "./useRoom.js";
import { ACTION_TYPES, NODE_TYPES, EDGE_TYPES } from "../utils/canvasConstants.js";

const MOVE_THROTTLE_MS = 50;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3.0;

export function useCanvas() {
  const { socket, roomId } = useRoom();

  const [nodes, setNodes] = useState(new Map());
  const [edges, setEdges] = useState(new Map());
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [connectingNodeId, setConnectingNodeId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Throttled movement timers & pending position map
  const moveThrottleTimers = useRef(new Map());
  const pendingMoveCoordinates = useRef(new Map());

  // -------------------------------------------------------------
  // 1. Socket Event Listeners: canvas:init, canvas:action, canvas:batch_action
  // -------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    // Initial state loading from server
    const handleCanvasInit = ({ state }) => {
      if (!state) return;
      const nextNodes = new Map();
      const nextEdges = new Map();

      for (const node of state.nodes || []) {
        nextNodes.set(node.id, node);
      }
      for (const edge of state.edges || []) {
        nextEdges.set(edge.id, edge);
      }

      setNodes(nextNodes);
      setEdges(nextEdges);
      setIsLoading(false);
    };

    // Remote peer action relay
    const handleRemoteAction = (action) => {
      if (!action || !action.type || !action.payload) return;
      const { type, payload } = action;

      switch (type) {
        case ACTION_TYPES.CREATE_NODE: {
          setNodes((prev) => {
            const next = new Map(prev);
            next.set(payload.id, payload);
            return next;
          });
          break;
        }

        case ACTION_TYPES.UPDATE_NODE: {
          setNodes((prev) => {
            const next = new Map(prev);
            const existing = next.get(payload.id);
            if (existing) {
              next.set(payload.id, { ...existing, ...payload });
            }
            return next;
          });
          break;
        }

        case ACTION_TYPES.MOVE_NODE: {
          setNodes((prev) => {
            const next = new Map(prev);
            const existing = next.get(payload.id);
            if (existing) {
              next.set(payload.id, { ...existing, x: payload.x, y: payload.y });
            }
            return next;
          });
          break;
        }

        case ACTION_TYPES.DELETE_NODE: {
          setNodes((prev) => {
            const next = new Map(prev);
            next.delete(payload.id);
            return next;
          });
          // Remove connected edges in memory
          setEdges((prev) => {
            const next = new Map();
            for (const [id, edge] of prev.entries()) {
              if (edge.fromId !== payload.id && edge.toId !== payload.id) {
                next.set(id, edge);
              }
            }
            return next;
          });
          break;
        }

        case ACTION_TYPES.CREATE_EDGE: {
          setEdges((prev) => {
            const next = new Map(prev);
            next.set(payload.id, payload);
            return next;
          });
          break;
        }

        case ACTION_TYPES.DELETE_EDGE: {
          setEdges((prev) => {
            const next = new Map(prev);
            next.delete(payload.id);
            return next;
          });
          break;
        }

        default:
          break;
      }
    };

    const handleBatchAction = ({ actions }) => {
      if (Array.isArray(actions)) {
        for (const action of actions) {
          handleRemoteAction(action);
        }
      }
    };

    socket.on("canvas:init", handleCanvasInit);
    socket.on("canvas:action", handleRemoteAction);
    socket.on("canvas:batch_action", handleBatchAction);

    return () => {
      socket.off("canvas:init", handleCanvasInit);
      socket.off("canvas:action", handleRemoteAction);
      socket.off("canvas:batch_action", handleBatchAction);
    };
  }, [socket]);

  // -------------------------------------------------------------
  // 2. Action Dispatchers with Client UUIDs & Ack-based Rollback
  // -------------------------------------------------------------

  /**
   * Creates a new node.
   * Generates UUID upfront client-side so local and server state share identical ID.
   */
  const createNode = useCallback(
    ({ text = "New Note", type = NODE_TYPES.IDEA, x = 100, y = 100, metadata = {}, semanticKey = null } = {}) => {
      const id = crypto.randomUUID();
      const node = {
        id,
        roomId,
        text,
        type,
        x: Math.round(x),
        y: Math.round(y),
        metadata,
        semanticKey,
        sourceType: "manual",
        createdAt: new Date().toISOString(),
      };

      const action = {
        type: ACTION_TYPES.CREATE_NODE,
        roomId,
        payload: node,
        timestamp: Date.now(),
      };

      // Optimistic local insert
      setNodes((prev) => {
        const next = new Map(prev);
        next.set(id, node);
        return next;
      });

      setSelectedNodeId(id);

      // Socket dispatch with rollback on error ack
      if (socket) {
        socket.emit("canvas:action", { action }, (ack) => {
          if (!ack?.success) {
            console.error("[useCanvas] Server rejected CREATE_NODE, rolling back:", ack?.error);
            setNodes((prev) => {
              const next = new Map(prev);
              next.delete(id);
              return next;
            });
          }
        });
      }

      return id;
    },
    [socket, roomId]
  );

  /**
   * Updates an existing node with rollback on error.
   */
  const updateNode = useCallback(
    (id, updates) => {
      let snapshot = null;

      // Optimistic update
      setNodes((prev) => {
        const next = new Map(prev);
        const current = next.get(id);
        if (!current) return prev;
        snapshot = current;
        next.set(id, { ...current, ...updates });
        return next;
      });

      const action = {
        type: ACTION_TYPES.UPDATE_NODE,
        roomId,
        payload: { id, roomId, ...updates },
        timestamp: Date.now(),
      };

      if (socket) {
        socket.emit("canvas:action", { action }, (ack) => {
          if (!ack?.success && snapshot) {
            console.error("[useCanvas] Server rejected UPDATE_NODE, rolling back:", ack?.error);
            setNodes((prev) => {
              const next = new Map(prev);
              next.set(id, snapshot);
              return next;
            });
          }
        });
      }
    },
    [socket, roomId]
  );

  /**
   * Moves a node optimistically at 60fps with throttled 50ms socket emission.
   */
  const moveNode = useCallback(
    (id, x, y) => {
      const roundedX = Math.round(x);
      const roundedY = Math.round(y);

      // 1. Optimistic local update immediately for buttery smooth 60fps rendering
      setNodes((prev) => {
        const next = new Map(prev);
        const node = next.get(id);
        if (!node) return prev;
        next.set(id, { ...node, x: roundedX, y: roundedY });
        return next;
      });

      // 2. Queue throttled socket emission
      pendingMoveCoordinates.current.set(id, { x: roundedX, y: roundedY });

      if (!moveThrottleTimers.current.has(id)) {
        const timer = setTimeout(() => {
          moveThrottleTimers.current.delete(id);
          const coords = pendingMoveCoordinates.current.get(id);
          if (!coords || !socket) return;

          const action = {
            type: ACTION_TYPES.MOVE_NODE,
            roomId,
            payload: { id, roomId, x: coords.x, y: coords.y },
            timestamp: Date.now(),
          };

          socket.emit("canvas:action", { action });
        }, MOVE_THROTTLE_MS);

        moveThrottleTimers.current.set(id, timer);
      }
    },
    [socket, roomId]
  );

  /**
   * Finalizes move on drag end, ensuring final coordinates are committed immediately.
   */
  const commitMoveNode = useCallback(
    (id, x, y) => {
      const timer = moveThrottleTimers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        moveThrottleTimers.current.delete(id);
      }
      pendingMoveCoordinates.current.delete(id);

      const roundedX = Math.round(x);
      const roundedY = Math.round(y);

      const action = {
        type: ACTION_TYPES.MOVE_NODE,
        roomId,
        payload: { id, roomId, x: roundedX, y: roundedY },
        timestamp: Date.now(),
      };

      if (socket) {
        socket.emit("canvas:action", { action });
      }
    },
    [socket, roomId]
  );

  /**
   * Deletes a node and connected edges with rollback snapshot.
   */
  const deleteNode = useCallback(
    (id) => {
      let nodeSnapshot = null;
      const edgeSnapshots = [];

      // Snapshot & optimistic local deletion
      setNodes((prev) => {
        const next = new Map(prev);
        nodeSnapshot = next.get(id);
        next.delete(id);
        return next;
      });

      setEdges((prev) => {
        const next = new Map();
        for (const [edgeId, edge] of prev.entries()) {
          if (edge.fromId === id || edge.toId === id) {
            edgeSnapshots.push(edge);
          } else {
            next.set(edgeId, edge);
          }
        }
        return next;
      });

      if (selectedNodeId === id) setSelectedNodeId(null);

      const action = {
        type: ACTION_TYPES.DELETE_NODE,
        roomId,
        payload: { id, roomId },
        timestamp: Date.now(),
      };

      if (socket) {
        socket.emit("canvas:action", { action }, (ack) => {
          if (!ack?.success && nodeSnapshot) {
            console.error("[useCanvas] Server rejected DELETE_NODE, rolling back:", ack?.error);
            setNodes((prev) => {
              const next = new Map(prev);
              next.set(id, nodeSnapshot);
              return next;
            });
            setEdges((prev) => {
              const next = new Map(prev);
              for (const edge of edgeSnapshots) {
                next.set(edge.id, edge);
              }
              return next;
            });
          }
        });
      }
    },
    [socket, roomId, selectedNodeId]
  );

  /**
   * Creates a connection edge between two nodes.
   * Generates client UUID upfront.
   */
  const createEdge = useCallback(
    ({ fromId, toId, type = EDGE_TYPES.RELATED_TO, label = null }) => {
      if (!fromId || !toId || fromId === toId) return null;

      // Prevent duplicate edge
      for (const edge of edges.values()) {
        if (edge.fromId === fromId && edge.toId === toId) {
          return edge.id;
        }
      }

      const id = crypto.randomUUID();
      const edge = {
        id,
        roomId,
        fromId,
        toId,
        type,
        label,
        createdAt: new Date().toISOString(),
      };

      const action = {
        type: ACTION_TYPES.CREATE_EDGE,
        roomId,
        payload: edge,
        timestamp: Date.now(),
      };

      // Optimistic insert
      setEdges((prev) => {
        const next = new Map(prev);
        next.set(id, edge);
        return next;
      });

      if (socket) {
        socket.emit("canvas:action", { action }, (ack) => {
          if (!ack?.success) {
            console.error("[useCanvas] Server rejected CREATE_EDGE, rolling back:", ack?.error);
            setEdges((prev) => {
              const next = new Map(prev);
              next.delete(id);
              return next;
            });
          }
        });
      }

      return id;
    },
    [socket, roomId, edges]
  );

  /**
   * Deletes an edge with rollback snapshot.
   */
  const deleteEdge = useCallback(
    (id) => {
      let snapshot = null;

      setEdges((prev) => {
        const next = new Map(prev);
        snapshot = next.get(id);
        next.delete(id);
        return next;
      });

      if (selectedEdgeId === id) setSelectedEdgeId(null);

      const action = {
        type: ACTION_TYPES.DELETE_EDGE,
        roomId,
        payload: { id, roomId },
        timestamp: Date.now(),
      };

      if (socket) {
        socket.emit("canvas:action", { action }, (ack) => {
          if (!ack?.success && snapshot) {
            console.error("[useCanvas] Server rejected DELETE_EDGE, rolling back:", ack?.error);
            setEdges((prev) => {
              const next = new Map(prev);
              next.set(id, snapshot);
              return next;
            });
          }
        });
      }
    },
    [socket, roomId, selectedEdgeId]
  );

  // -------------------------------------------------------------
  // 3. Viewport & Coordinate Transformation Math
  // -------------------------------------------------------------

  const screenToCanvas = useCallback(
    (clientX, clientY, containerRect) => {
      const relX = clientX - containerRect.left;
      const relY = clientY - containerRect.top;
      return {
        x: (relX - viewport.x) / viewport.zoom,
        y: (relY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  const canvasToScreen = useCallback(
    (canvasX, canvasY, containerRect) => {
      return {
        x: canvasX * viewport.zoom + viewport.x + containerRect.left,
        y: canvasY * viewport.zoom + viewport.y + containerRect.top,
      };
    },
    [viewport]
  );

  const pan = useCallback((dx, dy) => {
    setViewport((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  }, []);

  const zoomAt = useCallback((deltaZoom, clientX, clientY, containerRect) => {
    setViewport((prev) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * deltaZoom));
      if (nextZoom === prev.zoom) return prev;

      const mouseX = clientX - containerRect.left;
      const mouseY = clientY - containerRect.top;

      // Adjust viewport x & y so the point under cursor remains stationary
      const newX = mouseX - ((mouseX - prev.x) / prev.zoom) * nextZoom;
      const newY = mouseY - ((mouseY - prev.y) / prev.zoom) * nextZoom;

      return {
        x: newX,
        y: newY,
        zoom: nextZoom,
      };
    });
  }, []);

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  return {
    nodes: useMemo(() => Array.from(nodes.values()), [nodes]),
    edges: useMemo(() => Array.from(edges.values()), [edges]),
    nodesMap: nodes,
    edgesMap: edges,
    viewport,
    selectedNodeId,
    selectedEdgeId,
    connectingNodeId,
    isLoading,
    setSelectedNodeId,
    setSelectedEdgeId,
    setConnectingNodeId,
    createNode,
    updateNode,
    moveNode,
    commitMoveNode,
    deleteNode,
    createEdge,
    deleteEdge,
    screenToCanvas,
    canvasToScreen,
    pan,
    zoomAt,
    resetViewport,
  };
}


