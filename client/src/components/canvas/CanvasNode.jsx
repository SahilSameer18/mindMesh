import { useState, useRef, useEffect, useMemo, memo } from "react";
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
  Quote,
  RotateCw,
  Maximize2,
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
  onInspectVisual,
  zoom = 1,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text || "");
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });
  const dragCleanupRef = useRef(null);
  const inputRef = useRef(null);

  // Cleanup lingering window drag listeners on unmount
  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
        dragCleanupRef.current = null;
      }
    };
  }, []);

  // Client-side image lifecycle state (Option B: Zero-infrastructure error recovery)
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);
  const [prevImageUrl, setPrevImageUrl] = useState(node.metadata?.imageUrl);

  if (node.metadata?.imageUrl !== prevImageUrl) {
    setPrevImageUrl(node.metadata?.imageUrl);
    setImgLoaded(false);
    setImgError(false);
    setRetrySeed(0);
  }

  const handleRetryImage = (e) => {
    e.stopPropagation();
    setImgError(false);
    setImgLoaded(false);
    setRetrySeed(Date.now());
  };

  const displayImageUrl = useMemo(() => {
    if (!node.metadata?.imageUrl) return null;
    if (!retrySeed) return node.metadata.imageUrl;
    const separator = node.metadata.imageUrl.includes("?") ? "&" : "?";
    return `${node.metadata.imageUrl}${separator}retry=${retrySeed}`;
  }, [node.metadata?.imageUrl, retrySeed]);

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

    const cleanupListeners = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      dragCleanupRef.current = null;
    };

    const handlePointerUp = (upEvent) => {
      setIsDragging(false);
      const dx = (upEvent.clientX - dragStartRef.current.mouseX) / zoom;
      const dy = (upEvent.clientY - dragStartRef.current.mouseY) / zoom;
      const finalX = dragStartRef.current.nodeX + dx;
      const finalY = dragStartRef.current.nodeY + dy;
      onCommitMove(node.id, finalX, finalY);
      cleanupListeners();
    };

    const handlePointerCancel = () => {
      setIsDragging(false);
      cleanupListeners();
    };

    dragCleanupRef.current = cleanupListeners;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
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
        transform: `translate(${node.x}px, ${node.y}px)${isSelected && !isDragging ? " translateY(-2px)" : ""}`,
        touchAction: "none",
        transition: isDragging ? "none" : "transform 450ms cubic-bezier(0.16, 1, 0.3, 1)",
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
      className={`absolute select-none cursor-grab active:cursor-grabbing transition-[box-shadow,border-color] duration-150 rounded-2xl glass-panel group ${
        config.borderClass
      } ${
        isHighlighted
          ? "ring-4 ring-accent ring-offset-2 ring-offset-app shadow-[0_0_30px_rgba(168,84,46,0.35)] animate-pulse z-40"
          : isSelected
          ? "ring-2 ring-accent/60 shadow-elevated z-30"
          : isConnectingSource
          ? "ring-2 ring-amber-500 ring-dashed z-30"
          : "hover:border-border-strong shadow-card z-10"
      } ${isDragging ? "opacity-90 scale-[1.01]" : ""}`}
    >
      <div className="w-64 min-h-[96px] p-4 flex flex-col justify-between relative">
        {/* Card Header: Type Badge, Icon, & Action Buttons */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeBg}`}
            >
              <IconComponent className="w-3 h-3 shrink-0" />
              <span>{config.label}</span>
            </span>

            {node.metadata?.assignee && (
              <span className="text-[11px] font-medium text-text-muted bg-surface-subtle px-1.5 py-0.5 rounded border border-border-subtle truncate max-w-[80px]">
                @{node.metadata.assignee}
              </span>
            )}
          </div>

          {/* Action buttons (Evidence, Inspect Visual, Connect, Delete) */}
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
                  className="p-1 text-text-muted hover:text-accent hover:bg-surface-subtle rounded transition-colors cursor-pointer"
                >
                  <Quote className="w-3.5 h-3.5 text-accent" />
                </button>
              )}

            {/* Inspect Visual button for image nodes */}
            {node.type === NODE_TYPES.IMAGE && node.metadata?.imageUrl && (
              <button
                title="Inspect Visual Concept"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectVisual?.(node);
                }}
                className="p-1 text-text-muted hover:text-accent hover:bg-surface-subtle rounded transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-accent" />
              </button>
            )}

            <button
              title="Connect to node"
              onClick={(e) => {
                e.stopPropagation();
                onStartConnect(node.id);
              }}
              className="p-1 text-text-muted hover:text-amber-600 hover:bg-surface-subtle rounded transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              title="Delete node"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="p-1 text-text-muted hover:text-rose-600 hover:bg-surface-subtle rounded transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card Body: Text Content, Interactive Task, or Generative Visual */}
        <div className="flex-1 my-1">
          {node.type === NODE_TYPES.TASK && (
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={handleToggleTask}
                className="mt-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                {isTaskCompleted ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-text-faint" />
                )}
              </button>
              {isEditing ? (
                <textarea
                  ref={inputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleFinishEditing}
                  onKeyDown={handleKeyDown}
                  className="w-full text-sm bg-surface text-text-main p-1 rounded border border-accent outline-none resize-none font-sans"
                  rows={2}
                />
              ) : (
                <p
                  className={`text-sm leading-snug font-sans break-words ${
                    isTaskCompleted ? "line-through text-text-muted font-normal" : "text-text-main font-medium"
                  }`}
                >
                  {node.text}
                </p>
              )}
            </div>
          )}

          {node.type === NODE_TYPES.IMAGE && (
            <div className="mb-2">
              {!displayImageUrl || node.metadata?.status === "generating" ? (
                /* Generating Phase: Shimmering skeleton loader */
                <div className="w-full h-32 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col items-center justify-center p-3 relative overflow-hidden animate-pulse shadow-inner">
                  <ImageIcon className="w-5 h-5 text-accent mb-2 animate-pulse" />
                  <span className="text-xs font-semibold text-text-main">Synthesizing visual concept...</span>
                  <span className="text-[10px] text-text-muted mt-1">Generative Concept</span>
                </div>
              ) : imgError ? (
                /* Fallback Phase: Sleek Concept Blueprint container with subtle retry trigger */
                <div className="w-full min-h-32 rounded-xl bg-gradient-to-br from-accent/[0.06] via-amber-500/[0.05] to-surface-subtle border border-accent/20 p-3 flex flex-col justify-between relative overflow-hidden shadow-subtle group/fallback">
                  {/* Subtle decorative blueprint grid lines */}
                  <div className="absolute inset-0 bg-[radial-gradient(#A8542E_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.08] pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[11px] font-semibold text-text-main tracking-tight">Concept Blueprint</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetryImage}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-border hover:border-accent/50 text-[10px] font-medium text-text-muted hover:text-accent transition-colors shadow-subtle cursor-pointer active:scale-95"
                      title="Regenerate visual representation"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                      <span>Retry</span>
                    </button>
                  </div>

                  <p className="relative z-10 text-[11px] text-text-muted line-clamp-2 leading-relaxed italic">
                    {node.metadata?.prompt || node.text || "Generative concept visual blueprint"}
                  </p>

                  <div className="relative z-10 mt-2 flex items-center justify-between text-[9px] text-text-faint pt-1 border-t border-accent/15">
                    <span>Generative AI Service</span>
                    <span className="font-mono">Offline Fallback</span>
                  </div>
                </div>
              ) : (
                /* Ready Phase: Image container with skeleton under-layer and smooth fade-in */
                <div
                  className="relative w-full h-32 rounded-xl overflow-hidden border border-border-subtle bg-surface-subtle group/img cursor-zoom-in shadow-subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (imgLoaded) {
                      onInspectVisual?.(node);
                    }
                  }}
                  title="Click to inspect high-resolution visual concept"
                >
                  {!imgLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-subtle animate-pulse">
                      <ImageIcon className="w-5 h-5 text-text-faint mb-1 animate-pulse" />
                      <span className="text-[11px] font-medium text-text-muted">Loading visual...</span>
                    </div>
                  )}
                  <img
                    src={displayImageUrl}
                    alt={node.text || "Generated Visual"}
                    loading="lazy"
                    onLoad={() => {
                      setImgLoaded(true);
                      setImgError(false);
                    }}
                    onError={() => {
                      setImgLoaded(false);
                      setImgError(true);
                    }}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                    } group-hover/img:scale-105`}
                  />
                  {imgLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2">
                      <span className="text-[10px] font-medium text-white flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 shadow">
                        <Maximize2 className="w-2.5 h-2.5 text-accent" />
                        Inspect
                      </span>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-text-main font-medium mt-1.5 line-clamp-2">{node.text}</p>
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
                  className="w-full text-sm bg-surface text-text-main p-1.5 rounded border border-accent outline-none resize-none font-sans"
                  rows={2}
                />
              ) : (
                <p className="text-sm leading-relaxed text-text-main font-medium break-words">
                  {node.text || <span className="italic text-text-faint">Double click to add details...</span>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card Footer: Origin Metadata (e.g. Echo Voice speech-to-text indicator) */}
        {node.sourceType === "transcript" && (
          <div className="mt-1.5 pt-1 border-t border-border-subtle flex items-center justify-end text-[10px]">
            <span className="inline-flex items-center gap-1 text-accent font-medium bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
              Echo Voice
            </span>
          </div>
        )}

        {/* Right Connection Port Anchor Handle */}
        <button
          title="Drag or click to link"
          className="connect-handle absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface border-2 border-border-strong hover:border-accent hover:bg-accent/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-subtle cursor-crosshair z-40"
          onClick={(e) => {
            e.stopPropagation();
            onStartConnect(node.id);
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-border-strong group-hover:bg-accent" />
        </button>
      </div>
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeComponent);

