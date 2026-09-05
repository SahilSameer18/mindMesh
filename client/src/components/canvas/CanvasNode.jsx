import { useState, useRef, useEffect, memo } from "react";
import {
  Target,
  Lightbulb,
  CheckSquare,
  Square,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  User as UserIcon,
  Image as ImageIcon,
  Trash2,
  Link2,
  Sparkles,
} from "lucide-react";
import { NODE_CONFIGS, NODE_TYPES } from "../../utils/canvasConstants.js";

const ICON_MAP = {
  Target,
  Lightbulb,
  CheckSquare,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  User: UserIcon,
  Image: ImageIcon,
};

function CanvasNodeComponent({
  node,
  isSelected,
  isHighlighted = false,
  isConnectingSource,
  isConnecting,
  onSelect,
  onMove,
  onCommitMove,
  onUpdate,
  onDelete,
  onStartConnect,
  onEndConnect,
  onInspectEvidence,
  zoom = 1,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text || "");
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });
  const inputRef = useRef(null);

  const config = NODE_CONFIGS[node.type] || NODE_CONFIGS[NODE_TYPES.IDEA];
  const IconComponent = ICON_MAP[config.icon] || Lightbulb;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Pointer drag handling for node movement
  const handlePointerDown = (e) => {
    // Don't drag if clicking buttons, inputs, or connector handles
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".connect-handle") || isEditing) {
      return;
    }

    e.stopPropagation();
    onSelect(node.id);

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };

    const handlePointerMove = (moveEvent) => {
      const dx = (moveEvent.clientX - dragStartRef.current.mouseX) / zoom;
      const dy = (moveEvent.clientY - dragStartRef.current.mouseY) / zoom;
      const newX = dragStartRef.current.nodeX + dx;
      const newY = dragStartRef.current.nodeY + dy;
      onMove(node.id, newX, newY);
    };

    const handlePointerUp = (upEvent) => {
      setIsDragging(false);
      const dx = (upEvent.clientX - dragStartRef.current.mouseX) / zoom;
      const dy = (upEvent.clientY - dragStartRef.current.mouseY) / zoom;
      const finalX = dragStartRef.current.nodeX + dx;
      const finalY = dragStartRef.current.nodeY + dy;
      onCommitMove(node.id, finalX, finalY);

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleFinishEditing = () => {
    setIsEditing(false);
    if (editText.trim() && editText !== node.text) {
      onUpdate(node.id, { text: editText.trim() });
    } else {
      setEditText(node.text || "");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(node.text || "");
    }
  };

  // Task completion toggle
  const isTaskCompleted = node.type === NODE_TYPES.TASK && node.metadata?.status === "completed";
  const handleToggleTask = (e) => {
    e.stopPropagation();
    const nextStatus = isTaskCompleted ? "pending" : "completed";
    onUpdate(node.id, {
      metadata: { ...(node.metadata || {}), status: nextStatus },
    });
  };

  return (
    <div
      id={`canvas-node-${node.id}`}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        e.stopPropagation();
        if (isConnecting && onEndConnect) onEndConnect(node.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditText(node.text || "");
        setIsEditing(true);
      }}
      className={`absolute select-none cursor-grab active:cursor-grabbing transition-shadow duration-150 rounded-2xl glass-panel group ${
        config.borderClass
      } ${
        isHighlighted
          ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_35px_rgba(6,182,212,0.6)] animate-pulse z-40"
          : isSelected
          ? `ring-2 ring-sky-400/80 shadow-2xl z-30 ${config.glowClass}`
          : isConnectingSource
          ? "ring-2 ring-amber-400 ring-dashed z-30"
          : "hover:border-slate-500/80 shadow-lg z-10"
      } ${isDragging ? "opacity-90 scale-[1.01]" : ""}`}
    >
      <div className="w-64 min-h-[96px] p-4 flex flex-col justify-between relative">
        {/* Card Header: Type Badge, Icon, & Action Buttons */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.badgeBg}`}
            >
              <IconComponent className="w-3 h-3" />
              <span>{config.label}</span>
            </span>

            {node.metadata?.assignee && (
              <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 truncate max-w-[80px]">
                @{node.metadata.assignee}
              </span>
            )}
          </div>

          {/* Action buttons (Evidence, Connect, Delete) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Gate Evidence button: only show on nodes with real AI lineage or transcript evidence */}
            {node.sourceType !== "manual" &&
              (node.sourceId || node.metadata?.sourceQuote || node.metadata?.evidence) && (
                <button
                  title="Why this exists (Evidence)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectEvidence?.(node);
                  }}
                  className="p-1 text-slate-400 hover:text-violet-300 hover:bg-slate-800/90 rounded transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                </button>
              )}
            <button
              title="Connect to node"
              onClick={(e) => {
                e.stopPropagation();
                onStartConnect(node.id);
              }}
              className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800/90 rounded transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              title="Delete node"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800/90 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card Body: Text Content or Interactive Task */}
        <div className="flex-1 my-1">
          {node.type === NODE_TYPES.TASK && (
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={handleToggleTask}
                className="mt-0.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {isTaskCompleted ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {isEditing ? (
                <textarea
                  ref={inputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleFinishEditing}
                  onKeyDown={handleKeyDown}
                  className="w-full text-sm bg-slate-900/90 text-slate-100 p-1 rounded border border-sky-500/50 outline-none resize-none font-sans"
                  rows={2}
                />
              ) : (
                <p
                  className={`text-sm leading-snug font-sans break-words ${
                    isTaskCompleted ? "line-through text-slate-400 font-normal" : "text-slate-100 font-medium"
                  }`}
                >
                  {node.text}
                </p>
              )}
            </div>
          )}

          {node.type === NODE_TYPES.IMAGE && (
            <div className="mb-2">
              {node.metadata?.imageUrl ? (
                <img
                  src={node.metadata.imageUrl}
                  alt={node.text || "Generated Visual"}
                  className="w-full h-32 object-cover rounded-lg border border-slate-800"
                />
              ) : (
                <div className="w-full h-28 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center animate-pulse">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" /> Visual generating...
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-300 font-medium mt-1.5">{node.text}</p>
            </div>
          )}

          {node.type !== NODE_TYPES.TASK && node.type !== NODE_TYPES.IMAGE && (
            <div>
              {isEditing ? (
                <textarea
                  ref={inputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleFinishEditing}
                  onKeyDown={handleKeyDown}
                  className="w-full text-sm bg-slate-900/90 text-slate-100 p-1.5 rounded border border-sky-500/50 outline-none resize-none font-sans"
                  rows={2}
                />
              ) : (
                <p className="text-sm leading-relaxed text-slate-100 font-medium break-words">
                  {node.text || <span className="italic text-slate-500">Double click to add details...</span>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card Footer: Metadata info (e.g. source/status) */}
        {node.semanticKey && (
          <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="truncate max-w-[140px]">key: {node.semanticKey}</span>
            {node.sourceType === "transcript" && <span className="text-sky-400">Echo Voice</span>}
          </div>
        )}

        {/* Right Connection Port Anchor Handle */}
        <button
          title="Drag or click to link"
          className="connect-handle absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-500 hover:border-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-crosshair z-40"
          onClick={(e) => {
            e.stopPropagation();
            onStartConnect(node.id);
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-sky-400" />
        </button>
      </div>
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeComponent);

