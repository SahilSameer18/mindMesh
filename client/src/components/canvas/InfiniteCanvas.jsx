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
} from "lucide-react";
import { CanvasNode } from "./CanvasNode.jsx";
import { CanvasEdge } from "./CanvasEdge.jsx";
import { MultiplayerCursors } from "./MultiplayerCursors.jsx";
import { Minimap } from "./Minimap.jsx";
import { PresenterFollowBanner } from "../presence/PresenterFollowBanner.jsx";
import { useRoom } from "../../hooks/useRoom.js";
import { NODE_TYPES, EDGE_TYPES } from "../../utils/canvasConstants.js";

export default function InfiniteCanvas({ canvas }) {
  const {
    nodes,
    edges,
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
    cancelFlyTo,
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
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastCursorEmitRef = useRef(0);
  const lastViewportEmitRef = useRef(0);

  // Handle Space key for canvas panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !isSpacePressed && !e.target.matches("input, textarea")) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === "Escape") {
        setConnectingNodeId(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
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
  }, [isSpacePressed, setConnectingNodeId, setSelectedNodeId, setSelectedEdgeId]);

  // Wheel Zoom centered around mouse pointer (breaks follow mode on manual interaction)
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      if (isFollowing) {
        setFollowing(false);
      }
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomAt(zoomFactor, e.clientX, e.clientY, rect);
    },
    [zoomAt, isFollowing, setFollowing]
  );

  // Pointer Down for background pan (breaks follow mode on manual interaction)
  const handlePointerDown = useCallback(
    (e) => {
      if (isFollowing) {
        setFollowing(false);
      }
      // Middle-click (button 1) or Left-click with Space pressed or clicking empty canvas background
      if (e.button === 1 || isSpacePressed || e.target === containerRef.current || e.target.classList.contains("canvas-bg")) {
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

  // Quick Node Creator helper placing new nodes near viewport center
  const handleQuickAdd = (type) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const canvasPos = screenToCanvas(centerX, centerY, rect);

    // Add slight random offset to prevent overlapping nodes
    const offsetX = (Math.random() - 0.5) * 80;
    const offsetY = (Math.random() - 0.5) * 80;

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
      x: canvasPos.x - 128 + offsetX,
      y: canvasPos.y - 48 + offsetY,
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
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative w-full h-full overflow-hidden canvas-grid bg-slate-950 select-none ${
        isPanning || isSpacePressed ? "cursor-grab active:cursor-grabbing" : connectingNodeId ? "cursor-crosshair" : "cursor-default"
      }`}
      style={{
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
      }}
    >
      {/* Background click target for deselection */}
      <div className="absolute inset-0 canvas-bg pointer-events-auto" />

      {/* Skeleton Loading State (Rule 7: Prefer Skeleton Loaders over Raw Spinners) */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm z-50 pointer-events-none">
          <div className="flex flex-col items-center gap-6">
            <div className="grid grid-cols-2 gap-4 w-72">
              <div className="h-24 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2 animate-pulse shadow-lg">
                <div className="h-3 w-16 bg-slate-700/60 rounded" />
                <div className="h-2.5 w-24 bg-slate-800 rounded" />
                <div className="h-2 w-20 bg-slate-800/40 rounded" />
              </div>
              <div className="h-24 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2 animate-pulse shadow-lg">
                <div className="h-3 w-14 bg-slate-700/60 rounded" />
                <div className="h-2.5 w-20 bg-slate-800 rounded" />
                <div className="h-2 w-16 bg-slate-800/40 rounded" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <div className="h-3.5 w-36 bg-slate-800/80 rounded-full animate-pulse mx-auto" />
              <div className="h-2.5 w-48 bg-slate-800/40 rounded-full animate-pulse mx-auto" />
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 border border-sky-500/50 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span className="text-xs font-medium text-slate-200">
            Click another card to connect, or press Esc to cancel
          </span>
          <button
            onClick={() => setConnectingNodeId(null)}
            className="p-0.5 text-slate-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Option 2A: Vertical Canvas Creation Dock (Left rail, like Figma/Miro) */}
      <aside
        aria-label="Canvas Creation Tools"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 p-1.5 bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl pointer-events-auto"
      >
        <button
          type="button"
          title="Add Goal (Target)"
          onClick={() => handleQuickAdd(NODE_TYPES.GOAL)}
          className="p-2.5 rounded-xl text-amber-300 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <Target className="w-4 h-4 text-amber-400" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-slate-900/95 border border-slate-700 text-xs font-medium text-slate-200 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Goal (Target)
          </span>
        </button>

        <button
          type="button"
          title="Add Idea"
          onClick={() => handleQuickAdd(NODE_TYPES.IDEA)}
          className="p-2.5 rounded-xl text-sky-300 hover:bg-sky-500/15 border border-transparent hover:border-sky-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <Lightbulb className="w-4 h-4 text-sky-400" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-slate-900/95 border border-slate-700 text-xs font-medium text-slate-200 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Idea
          </span>
        </button>

        <button
          type="button"
          title="Add Task"
          onClick={() => handleQuickAdd(NODE_TYPES.TASK)}
          className="p-2.5 rounded-xl text-emerald-300 hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <CheckSquare className="w-4 h-4 text-emerald-400" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-slate-900/95 border border-slate-700 text-xs font-medium text-slate-200 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Task
          </span>
        </button>

        <button
          type="button"
          title="Add Decision"
          onClick={() => handleQuickAdd(NODE_TYPES.DECISION)}
          className="p-2.5 rounded-xl text-indigo-300 hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-slate-900/95 border border-slate-700 text-xs font-medium text-slate-200 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Decision
          </span>
        </button>

        <button
          type="button"
          title="Add Question"
          onClick={() => handleQuickAdd(NODE_TYPES.QUESTION)}
          className="p-2.5 rounded-xl text-purple-300 hover:bg-purple-500/15 border border-transparent hover:border-purple-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-slate-900/95 border border-slate-700 text-xs font-medium text-slate-200 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Question
          </span>
        </button>

        <button
          type="button"
          title="Add Risk"
          onClick={() => handleQuickAdd(NODE_TYPES.RISK)}
          className="p-2.5 rounded-xl text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all relative group flex items-center justify-center cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-slate-900/95 border border-slate-700 text-xs font-medium text-slate-200 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Add Risk
          </span>
        </button>

        <div className="w-5 h-px bg-slate-700/60 my-0.5" />

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
              ? "text-emerald-300 bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              : tidyFeedback === "empty"
              ? "text-amber-300 bg-amber-500/20 border-amber-500/40"
              : tidyFeedback === "error"
              ? "text-rose-300 bg-rose-500/20 border-rose-500/40"
              : isTidying
              ? "text-cyan-200 bg-cyan-500/25 border-cyan-500/50 animate-pulse"
              : nodes.length === 0
              ? "text-slate-500 cursor-not-allowed opacity-50 border-transparent"
              : "text-cyan-300 hover:bg-cyan-500/15 border-transparent hover:border-cyan-500/30"
          } border`}
        >
          <GitFork
            className={`w-4 h-4 rotate-180 transition-transform ${
              isTidying ? "animate-spin text-cyan-200" : tidyFeedback === "success" ? "text-emerald-400 scale-110" : "text-cyan-400"
            }`}
          />
          <span className="absolute left-full ml-2.5 px-2 py-1 rounded-lg bg-slate-900/95 border border-slate-700 text-xs font-medium text-slate-200 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
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
      </aside>

      {/* Compact Viewport Controls (Bottom-Left Mini-Pill) */}
      <aside
        aria-label="Viewport Controls"
        className="absolute bottom-6 left-6 z-30 flex items-center gap-1 p-1 bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-xl pointer-events-auto"
      >
        <button
          type="button"
          title="Zoom Out"
          onClick={() => {
            const rect = containerRef.current.getBoundingClientRect();
            zoomAt(0.85, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono text-slate-400 min-w-[34px] text-center select-none">
          {Math.round(viewport.zoom * 100)}%
        </span>

        <button
          type="button"
          title="Zoom In"
          onClick={() => {
            const rect = containerRef.current.getBoundingClientRect();
            zoomAt(1.15, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          title="Reset View"
          onClick={resetViewport}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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
