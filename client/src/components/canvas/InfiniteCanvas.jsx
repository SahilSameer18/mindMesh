import { useRef, useState, useCallback, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Target,
  Lightbulb,
  CheckSquare,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  GitFork,
  X,
  Bookmark,
} from "lucide-react";
import { CanvasNode } from "./CanvasNode.jsx";
import { CanvasEdge } from "./CanvasEdge.jsx";
import { MultiplayerCursors } from "./MultiplayerCursors.jsx";
import { Minimap } from "./Minimap.jsx";
import { PresenterFollowBanner } from "../presence/PresenterFollowBanner.jsx";
import { useRoom } from "../../hooks/useRoom.js";
import { NODE_TYPES, EDGE_TYPES } from "../../utils/canvasConstants.js";
import { findAvailableSpot } from "../../utils/layout.js";

export default function InfiniteCanvas({ canvas }) {
  const {
    nodes,
    edges,
    zones,
    nodesMap,
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
    pan,
    zoomAt,
    resetViewport,
    setViewportDirect,
    flyTo,
    createZone,
    deleteZone,
    flyToZone,
  } = canvas;

  const {
    socket,
    currentUser,
    peerCursors,
    peerViewports,
    activePresenter,
    isFollowing,
    setFollowing,
    presenterContestError,
    clearPresenterContestError,
  } = useRoom();

  const containerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });
  const [isTidying, setIsTidying] = useState(false);
  const [tidyFeedback, setTidyFeedback] = useState(null); // null | "success" | "empty" | "error"
  const [showZonesPanel, setShowZonesPanel] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchDistRef = useRef(null);
  const touchCenterRef = useRef(null);
  const lastCursorEmitRef = useRef(0);
  const lastViewportEmitRef = useRef(0);

  // Handle keyboard shortcuts (Space to pan, Escape to deselect, Ctrl +/-/0 for canvas zoom)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !isSpacePressed && !e.target.matches("input, textarea")) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === "Escape") {
        setConnectingNodeId(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setShowZonesPanel(false);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "0")) {
        // Prevent browser whole-page zoom and apply to canvas instead
        e.preventDefault();
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        if (e.key === "+" || e.key === "=") {
          zoomAt(1.15, centerX, centerY, rect);
        } else if (e.key === "-") {
          zoomAt(0.85, centerX, centerY, rect);
        } else if (e.key === "0") {
          resetViewport();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed, setConnectingNodeId, setSelectedNodeId, setSelectedEdgeId, zoomAt, resetViewport]);

  // Native non-passive Wheel / Trackpad listener to prevent browser whole-page zoom
  // Follows Figma/Miro standard: trackpad pinch (ctrlKey) zooms; 2-finger scroll pans
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      // Actively cancel browser native page zoom (non-passive listener)
      e.preventDefault();

      if (isFollowing) {
        setFollowing(false);
      }

      const rect = container.getBoundingClientRect();

      // Case 1: Trackpad pinch gesture (browsers emit wheel with ctrlKey=true) OR Ctrl+Mouse Wheel
      if (e.ctrlKey || e.metaKey) {
        // Smooth continuous exponential zoom proportional to pinch distance
        const factor = Math.exp(-e.deltaY * 0.008);
        zoomAt(factor, e.clientX, e.clientY, rect);
        return;
      }

      // Case 2: Shift + Wheel horizontal scroll
      if (e.shiftKey) {
        pan(-e.deltaY, 0);
        return;
      }

      // Case 3: Trackpad two-finger glide OR regular mouse wheel
      // Laptop trackpads emit both deltaX and deltaY to glide smoothly across the board
      pan(-e.deltaX, -e.deltaY);
    };

    const preventGesture = (e) => e.preventDefault();

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("gesturestart", preventGesture);
    container.addEventListener("gesturechange", preventGesture);

    return () => {
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("gesturestart", preventGesture);
      container.removeEventListener("gesturechange", preventGesture);
    };
  }, [isFollowing, setFollowing, zoomAt, pan]);

  // Pointer Down for background pan (breaks follow mode on manual interaction)
  const handlePointerDown = useCallback(
    (e) => {
      if (isFollowing) {
        setFollowing(false);
      }
      // Middle-click (button 1) or Left-click with Space pressed or clicking empty canvas background
      if (e.button === 1 || isSpacePressed || e.target === containerRef.current || e.target.classList.contains("canvas-bg")) {
        // preventDefault() below (needed to stop native drag/text-selection while panning) also
        // suppresses the browser's implicit blur of whatever's focused — e.g. a node mid-edit —
        // so force that blur explicitly first, letting CanvasNode's onBlur commit the edit.
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    },
    [isSpacePressed, setSelectedNodeId, setSelectedEdgeId, isFollowing, setFollowing]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Track mouse canvas coordinates for connection preview
      const canvasCoords = screenToCanvas(e.clientX, e.clientY, rect);
      setMouseCanvasPos(canvasCoords);

      // Throttled cursor emission (35ms / ~28 Hz)
      const now = performance.now();
      if (socket && now - lastCursorEmitRef.current >= 35) {
        lastCursorEmitRef.current = now;
        socket.emit("cursor:move", {
          x: Math.round(canvasCoords.x),
          y: Math.round(canvasCoords.y),
          user: currentUser,
        });
      }

      if (isPanning) {
        if (isFollowing) {
          setFollowing(false);
        }
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        pan(dx, dy);
      }
    },
    [isPanning, pan, screenToCanvas, socket, currentUser, isFollowing, setFollowing]
  );

  // Throttled viewport broadcast for peer radar minimaps
  useEffect(() => {
    if (!socket || !containerRef.current) return;
    const now = performance.now();
    if (now - lastViewportEmitRef.current >= 80) {
      lastViewportEmitRef.current = now;
      const rect = containerRef.current.getBoundingClientRect();
      socket.emit("presence:viewport", {
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
          width: rect.width,
          height: rect.height,
        },
      });
    }
  }, [socket, viewport.x, viewport.y, viewport.zoom]);

  // Follow-Me presenter sync: broadcast presenter camera coordinates to followers
  // Server-side presence.socket.js handles authoritative 30ms rate-limiting with trailing-edge flush
  useEffect(() => {
    if (!socket || !activePresenter || activePresenter.socketId !== socket.id) return;
    socket.emit("presenter:sync", {
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    });
  }, [socket, activePresenter, viewport.x, viewport.y, viewport.zoom]);

  // Follow-Me camera tracking: smoothly update local viewport when following active presenter
  useEffect(() => {
    if (!socket || !isFollowing || !activePresenter || activePresenter.socketId === socket.id) return;

    const handlePresenterSynced = ({ x, y, zoom }) => {
      if (setViewportDirect) {
        setViewportDirect(x, y, zoom);
      }
    };

    socket.on("presenter:synced", handlePresenterSynced);
    return () => {
      socket.off("presenter:synced", handlePresenterSynced);
    };
  }, [socket, isFollowing, activePresenter, setViewportDirect]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch Gestures: Pinch-to-zoom and two-finger pan for mobile touchscreens
  const handleTouchStart = useCallback(
    (e) => {
      if (e.touches.length === 2) {
        if (isFollowing) {
          setFollowing(false);
        }
        setIsPanning(false);
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchCenterRef.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
      }
    },
    [isFollowing, setFollowing]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (e.touches.length === 2 && touchDistRef.current && touchCenterRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        if (touchDistRef.current > 0) {
          const ratio = dist / touchDistRef.current;
          if (Math.abs(ratio - 1) > 0.005) {
            const rect = containerRef.current.getBoundingClientRect();
            zoomAt(ratio, midX, midY, rect);
            touchDistRef.current = dist;
          }
        }

        const dx = midX - touchCenterRef.current.x;
        const dy = midY - touchCenterRef.current.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          pan(dx, dy);
          touchCenterRef.current = { x: midX, y: midY };
        }
      }
    },
    [zoomAt, pan]
  );

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      touchDistRef.current = null;
      touchCenterRef.current = null;
    }
  }, []);

  // Quick Node Creator helper placing new nodes near viewport center
  const handleQuickAdd = (type) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const canvasPos = screenToCanvas(centerX, centerY, rect);

    const targetX = canvasPos.x - 140;
    const targetY = canvasPos.y - 70;
    const { x, y } = findAvailableSpot(targetX, targetY, nodes, 280, 160, 40);

    const titles = {
      [NODE_TYPES.GOAL]: "New Objective",
      [NODE_TYPES.IDEA]: "Fresh Concept",
      [NODE_TYPES.TASK]: "Immediate Action",
      [NODE_TYPES.DECISION]: "Team Decision",
      [NODE_TYPES.QUESTION]: "Open Question",
      [NODE_TYPES.RISK]: "Identified Risk",
    };

    createNode({
      type,
      text: titles[type] || "New Item",
      x,
      y,
    });
  };

  // Connection Linking
  const handleStartConnect = (sourceId) => {
    setConnectingNodeId(sourceId);
  };

  const handleEndConnect = (targetId) => {
    if (connectingNodeId && connectingNodeId !== targetId) {
      createEdge({
        fromId: connectingNodeId,
        toId: targetId,
        type: EDGE_TYPES.RELATED_TO,
      });
    }
    setConnectingNodeId(null);
  };

  const handleTidyGraph = () => {
    if (!socket || isTidying) return;
    if (!nodes || nodes.length === 0) {
      setTidyFeedback("empty");
      setTimeout(() => setTidyFeedback(null), 2000);
      return;
    }

    setIsTidying(true);
    socket.emit("canvas:command", { prompt: "/layout hierarchical" }, (res) => {
      setIsTidying(false);
      if (res && res.success !== false) {
        setTidyFeedback("success");
      } else {
        setTidyFeedback("error");
      }
      setTimeout(() => setTidyFeedback(null), 2000);
    });

    setTimeout(() => {
      setIsTidying(false);
    }, 1500);
  };

  // Connecting line preview
  const connectingSourceNode = connectingNodeId ? nodesMap.get(connectingNodeId) : null;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative w-full h-full overflow-hidden canvas-grid bg-app select-none touch-none ${
        isPanning || isSpacePressed ? "cursor-grab active:cursor-grabbing" : connectingNodeId ? "cursor-crosshair" : "cursor-default"
      }`}
      style={{
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
      }}
    >
      {/* Background click target for deselection */}
      <div className="absolute inset-0 canvas-bg pointer-events-auto" />

      {/* Skeleton Loading State (Rule: Prefer Skeleton Loaders over Raw Spinners) */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-app/85 backdrop-blur-md z-50 pointer-events-none">
          <div className="flex flex-col items-center gap-7 max-w-sm w-full px-4">
            {/* Mock Spatial Graph Nodes Skeleton */}
            <div className="relative w-full h-40 flex items-center justify-center">
              {/* Central root pillar skeleton */}
              <div className="absolute top-2 w-48 h-12 rounded-xl bg-surface border border-border-subtle shadow-card p-2.5 flex items-center gap-2 animate-pulse">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 bg-surface-hover rounded w-3/4" />
                  <div className="h-2 bg-surface-hover/70 rounded w-1/2" />
                </div>
              </div>

              {/* Connecting line skeletons */}
              <div className="absolute top-14 w-32 h-6 border-b-2 border-dashed border-border-subtle opacity-50" />

              {/* Branch child cards skeleton */}
              <div className="absolute bottom-2 flex gap-4">
                <div className="w-32 h-14 rounded-xl bg-surface border border-border-subtle shadow-card p-2 space-y-1.5 animate-pulse">
                  <div className="h-2 bg-surface-hover rounded w-2/3" />
                  <div className="h-1.5 bg-surface-hover/70 rounded w-5/6" />
                </div>
                <div className="w-32 h-14 rounded-xl bg-surface border border-border-subtle shadow-card p-2 space-y-1.5 animate-pulse">
                  <div className="h-2 bg-surface-hover rounded w-3/4" />
                  <div className="h-1.5 bg-surface-hover/70 rounded w-4/5" />
                </div>
              </div>
            </div>

            {/* Shimmering status indicator */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border-subtle shadow-sm text-xs font-semibold text-text-main font-mono">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Hydrating Spatial Canvas...</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Synchronizing live room state and collaborative nodes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SVG Canvas Layer for Edges and Active Connection Previews */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {edges.map((edge) => (
            <CanvasEdge
              key={edge.id}
              edge={edge}
              fromNode={nodesMap.get(edge.fromId)}
              toNode={nodesMap.get(edge.toId)}
              isSelected={selectedEdgeId === edge.id}
              isHighlighted={canvas.highlightedEdgeIds?.has(edge.id)}
              onSelect={setSelectedEdgeId}
              onDelete={deleteEdge}
            />
          ))}

          {/* Active drag connection preview line */}
          {connectingSourceNode && (
            <path
              d={`M ${connectingSourceNode.x + 256} ${connectingSourceNode.y + 48} C ${
                connectingSourceNode.x + 350
              } ${connectingSourceNode.y + 48}, ${mouseCanvasPos.x - 50} ${mouseCanvasPos.y}, ${mouseCanvasPos.x} ${mouseCanvasPos.y}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          )}
        </g>
      </svg>

      {/* HTML DOM Layer for Nodes */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Context Zones (Spatial bounding regions / bookmarks) */}
        <div className="relative pointer-events-auto">
          {(zones || []).map((zone) => (
            <div
              key={zone.id}
              className="absolute pointer-events-auto rounded-3xl border-2 border-dashed border-indigo-500/35 bg-indigo-500/[0.03] dark:border-indigo-400/25 dark:bg-indigo-500/[0.02] transition-all group hover:border-indigo-500/60"
              style={{
                left: `${zone.x - 300}px`,
                top: `${zone.y - 200}px`,
                width: "600px",
                height: "400px",
              }}
            >
              {/* Zone Header Tag */}
              <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full bg-surface/95 border border-indigo-500/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm flex items-center gap-1.5 backdrop-blur-sm select-none">
                <Bookmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-medium tracking-wide">{zone.name}</span>
                <button
                  type="button"
                  onClick={() => flyToZone(zone)}
                  className="ml-1.5 text-[10px] text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Fly to this zone"
                >
                  Jump
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteZone(zone.id);
                  }}
                  className="text-text-muted hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer ml-0.5"
                  title="Delete zone"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Coordinates Watermark */}
              <div className="absolute bottom-3 right-4 text-[10px] text-text-muted/40 font-mono pointer-events-none select-none">
                Zone: {Math.round(zone.x)}, {Math.round(zone.y)}
              </div>
            </div>
          ))}
        </div>

        <div className="relative pointer-events-auto">
          {nodes.map((node) => (
            <CanvasNode
              key={node.id}
              node={node}
              zoom={viewport.zoom}
              isSelected={selectedNodeId === node.id}
              isHighlighted={canvas.highlightedNodeIds?.has(node.id)}
              isConnectingSource={connectingNodeId === node.id}
              isConnecting={Boolean(connectingNodeId)}
              onSelect={setSelectedNodeId}
              onMove={moveNode}
              onCommitMove={commitMoveNode}
              onUpdate={updateNode}
              onDelete={deleteNode}
              onStartConnect={handleStartConnect}
              onEndConnect={handleEndConnect}
              onInspectEvidence={(n) => canvas.setInspectingNode?.(n)}
              onInspectVisual={(n) => canvas.setInspectingVisualNode?.(n)}
            />
          ))}
        </div>

        {/* Real-time Multiplayer Cursors in Canvas Space */}
        <MultiplayerCursors cursors={peerCursors} />
      </div>

      {/* Connecting Mode Banner */}
      {connectingNodeId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-surface/95 border border-sky-500/50 px-4 py-2 rounded-full shadow-elevated flex items-center gap-3 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span className="text-xs font-medium text-text-main">
            Click another card to connect, or press Esc to cancel
          </span>
          <button
            onClick={() => setConnectingNodeId(null)}
            className="p-0.5 text-text-muted hover:text-text-main rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Option 2A: Vertical Canvas Creation Dock (Left rail, like Figma/Miro) */}
      <aside
        aria-label="Canvas Creation Tools"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 p-1.5 bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-2xl shadow-elevated pointer-events-auto"
      >
        <button
          type="button"
          title="Add Goal (Target)"
          onClick={() => handleQuickAdd(NODE_TYPES.GOAL)}
          className="p-2.5 rounded-xl text-amber-600 dark:text-amber-300 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <Target className="w-4 h-4 text-amber-500" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-xs font-medium text-text-main shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Goal (Target)
          </span>
        </button>

        <button
          type="button"
          title="Add Idea"
          onClick={() => handleQuickAdd(NODE_TYPES.IDEA)}
          className="p-2.5 rounded-xl text-sky-600 dark:text-sky-300 hover:bg-sky-500/15 border border-transparent hover:border-sky-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <Lightbulb className="w-4 h-4 text-sky-500" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-xs font-medium text-text-main shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Idea
          </span>
        </button>

        <button
          type="button"
          title="Add Task"
          onClick={() => handleQuickAdd(NODE_TYPES.TASK)}
          className="p-2.5 rounded-xl text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <CheckSquare className="w-4 h-4 text-emerald-500" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-xs font-medium text-text-main shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Task
          </span>
        </button>

        <button
          type="button"
          title="Add Decision"
          onClick={() => handleQuickAdd(NODE_TYPES.DECISION)}
          className="p-2.5 rounded-xl text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-xs font-medium text-text-main shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Decision
          </span>
        </button>

        <button
          type="button"
          title="Add Question"
          onClick={() => handleQuickAdd(NODE_TYPES.QUESTION)}
          className="p-2.5 rounded-xl text-purple-600 dark:text-purple-300 hover:bg-purple-500/15 border border-transparent hover:border-purple-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-purple-500" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-xs font-medium text-text-main shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Question
          </span>
        </button>

        <button
          type="button"
          title="Add Risk"
          onClick={() => handleQuickAdd(NODE_TYPES.RISK)}
          className="p-2.5 rounded-xl text-rose-600 dark:text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-xs font-medium text-text-main shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Risk
          </span>
        </button>

        <div className="w-5 h-px bg-border-subtle my-0.5" />

        {/* Hierarchical Auto-Layout (Dagre DAG Engine) */}
        <button
          type="button"
          title={
            nodes.length === 0
              ? "Add nodes to tidy graph"
              : "Hierarchical Auto-Layout (Dagre DAG Engine)"
          }
          disabled={nodes.length === 0 || isTidying}
          onClick={handleTidyGraph}
          className={`p-2.5 rounded-xl transition-all relative group flex items-center justify-center cursor-pointer ${
            tidyFeedback === "success"
              ? "text-emerald-600 dark:text-emerald-300 bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              : tidyFeedback === "empty"
              ? "text-amber-600 dark:text-amber-300 bg-amber-500/20 border-amber-500/40"
              : tidyFeedback === "error"
              ? "text-rose-600 dark:text-rose-300 bg-rose-500/20 border-rose-500/40"
              : isTidying
              ? "text-cyan-600 dark:text-cyan-200 bg-cyan-500/25 border-cyan-500/50 animate-pulse"
              : nodes.length === 0
              ? "text-text-muted/40 cursor-not-allowed opacity-50 border-transparent"
              : "text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/15 border-transparent hover:border-cyan-500/30"
          } border`}
        >
          <GitFork
            className={`w-4 h-4 rotate-180 transition-transform ${
              isTidying ? "animate-spin text-cyan-500 dark:text-cyan-200" : tidyFeedback === "success" ? "text-emerald-500 scale-110" : "text-cyan-500"
            }`}
          />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-xs font-medium text-text-main shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            {isTidying
              ? "Tidying..."
              : tidyFeedback === "success"
              ? "Tidied!"
              : tidyFeedback === "empty"
              ? "Empty Canvas"
              : tidyFeedback === "error"
              ? "Failed"
              : "Tidy Graph (Auto-Layout)"}
          </span>
        </button>

        <div className="w-5 h-px bg-border-subtle my-0.5" />

        {/* Context Zones Drawer Toggle */}
        <button
          type="button"
          title={`Context Zones (${zones?.length || 0})`}
          onClick={() => setShowZonesPanel((prev) => !prev)}
          className={`p-2.5 rounded-xl border transition-all relative group flex items-center justify-center cursor-pointer ${
            showZonesPanel
              ? "text-indigo-600 dark:text-indigo-300 bg-indigo-500/20 border-indigo-500/40 shadow-sm"
              : "text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/15 border-transparent hover:border-indigo-500/30"
          }`}
        >
          <Bookmark className="w-4 h-4 text-indigo-500" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-xs font-medium text-text-main shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Context Zones ({zones?.length || 0})
          </span>
        </button>
      </aside>

      {/* Context Zones Quick-Jump & Creation Drawer */}
      {showZonesPanel && (
        <div className="absolute left-20 top-1/2 -translate-y-1/2 z-40 w-72 bg-surface/95 backdrop-blur-xl border border-border-subtle rounded-2xl shadow-elevated p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-150 pointer-events-auto">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-text-main">Context Zones</span>
            </div>
            <button
              type="button"
              onClick={() => setShowZonesPanel(false)}
              className="p-1 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-subtle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Form to create zone from current camera view */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newZoneName.trim()) return;
              const screenW = containerRef.current ? containerRef.current.clientWidth : window.innerWidth;
              const screenH = containerRef.current ? containerRef.current.clientHeight : window.innerHeight;
              const centerX = (screenW / 2 - viewport.x) / viewport.zoom;
              const centerY = (screenH / 2 - viewport.y) / viewport.zoom;
              createZone({
                name: newZoneName.trim(),
                x: centerX,
                y: centerY,
                zoom: viewport.zoom,
              });
              setNewZoneName("");
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Zone name..."
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-subtle border border-border-subtle text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!newZoneName.trim()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Save View
            </button>
          </form>

          {/* List of saved zones */}
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {(!zones || zones.length === 0) ? (
              <p className="text-xs text-text-muted text-center py-4">
                No context zones yet.<br />Pan anywhere and click &ldquo;Save View&rdquo; to bookmark regions.
              </p>
            ) : (
              zones.map((z) => (
                <div
                  key={z.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border-subtle group transition-all"
                >
                  <button
                    type="button"
                    onClick={() => flyToZone(z)}
                    className="flex-1 text-left flex flex-col cursor-pointer"
                  >
                    <span className="text-xs font-medium text-text-main group-hover:text-indigo-500 transition-colors">
                      {z.name}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      Zoom: {Math.round((z.zoom || 1) * 100)}%
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteZone(z.id)}
                    className="p-1 text-text-muted hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete zone"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Compact Viewport Controls (Bottom-Left Mini-Pill) */}
      <aside
        aria-label="Viewport Controls"
        className="absolute bottom-6 left-6 z-30 flex items-center gap-1 p-1 bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-2xl shadow-subtle pointer-events-auto"
      >
        <button
          type="button"
          title="Zoom Out"
          onClick={() => {
            const rect = containerRef.current.getBoundingClientRect();
            zoomAt(0.85, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
          }}
          className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-subtle rounded-xl transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono text-text-muted min-w-[34px] text-center select-none">
          {Math.round(viewport.zoom * 100)}%
        </span>

        <button
          type="button"
          title="Zoom In"
          onClick={() => {
            const rect = containerRef.current.getBoundingClientRect();
            zoomAt(1.15, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
          }}
          className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-subtle rounded-xl transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          title="Reset View"
          onClick={resetViewport}
          className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-subtle rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </aside>

      {/* Floating Presenter Follow Banner & Contested Alerts */}
      <PresenterFollowBanner
        activePresenter={activePresenter}
        isFollowing={isFollowing}
        onStopFollowing={() => setFollowing(false)}
        contestError={presenterContestError}
        onClearContestError={clearPresenterContestError}
      />

      {/* Interactive Radar Minimap */}
      <Minimap
        nodes={nodes}
        viewport={viewport}
        peerViewports={peerViewports}
        containerRef={containerRef}
        flyTo={flyTo}
        setViewportDirect={setViewportDirect}
      />
    </div>
  );
}
