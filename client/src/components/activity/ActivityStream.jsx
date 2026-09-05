import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Check,
  Ban,
  Clock,
  ExternalLink,
  ChevronRight,
  Target,
  Lightbulb,
  CheckSquare,
  AlertTriangle,
  Link2,
  HelpCircle,
  Move,
} from "lucide-react";
import { useAIActions } from "../../hooks/useAIActions.js";

const ACTION_ICONS = {
  CREATE_NODE: Lightbulb,
  UPDATE_NODE: CheckSquare,
  DELETE_NODE: Ban,
  MOVE_NODE: Move,
  CREATE_EDGE: Link2,
  DELETE_EDGE: Link2,
  REORGANIZE_LAYOUT: Move,
  ANSWER_QUERY: HelpCircle,
};

function formatActionType(type) {
  switch (type) {
    case "CREATE_NODE":
      return "Node Created";
    case "UPDATE_NODE":
      return "Node Updated";
    case "DELETE_NODE":
      return "Node Removed";
    case "MOVE_NODE":
      return "Node Moved";
    case "CREATE_EDGE":
      return "Connection Linked";
    case "DELETE_EDGE":
      return "Connection Removed";
    case "REORGANIZE_LAYOUT":
      return "Layout Reorganized";
    case "ANSWER_QUERY":
      return "Workspace Query";
    default:
      return type?.replace(/_/g, " ") || "Action";
  }
}

export default function ActivityStream({ isOpen, onClose, canvas, aiActivity: externalAIActivity }) {
  const localAIActivity = useAIActions();
  const { actions, isLoading, proposedCount, approveAction, rejectAction } =
    externalAIActivity || localAIActivity;

  const [filter, setFilter] = useState("all"); // "all" | "applied" | "proposed"

  const filteredActions = actions.filter((a) => {
    if (filter === "applied") return a.status === "applied";
    if (filter === "proposed") return a.status === "proposed" || a.status === "clarify";
    return true;
  });

  const handleApprove = (actionId) => {
    approveAction(actionId);
  };

  const handleReject = (actionId) => {
    rejectAction(actionId);
  };

  if (!isOpen) return null;

  return (
    <aside aria-label="AI Activity Stream" className="fixed top-14 right-0 z-30 w-full sm:w-96 h-[calc(100vh-3.5rem)] bg-slate-900/95 border-l border-slate-800/80 backdrop-blur-2xl shadow-2xl flex flex-col text-slate-200 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>AI Activity Stream</span>
          </h2>
          {proposedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {proposedCount} proposed
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close activity stream"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 bg-slate-950/40 text-xs">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === "all" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
        >
          All ({actions.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("proposed")}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === "proposed" ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/50" : "text-slate-400 hover:text-slate-200"}`}
        >
          Needs Review ({proposedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("applied")}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === "applied" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
        >
          Applied
        </button>
      </div>

      {/* Action List with Skeleton Loader */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {isLoading ? (
          // Skeleton loaders conforming to user rule (no raw spinners)
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-slate-700/60 rounded w-1/3" />
                  <div className="h-3 bg-slate-700/60 rounded w-1/4" />
                </div>
                <div className="h-4 bg-slate-700/40 rounded w-3/4" />
                <div className="h-2 bg-slate-700/30 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="w-8 h-8 mb-2 opacity-30 text-violet-400" />
            <p className="text-sm font-medium text-slate-400">No activity recorded yet</p>
            <p className="text-xs mt-1 text-slate-500">
              Run commands via the Command Bar (⌘K) or start a meeting dialogue to populate the canvas.
            </p>
          </div>
        ) : (
          filteredActions.map((item) => {
            const Icon = ACTION_ICONS[item.type] || Sparkles;
            const isProposed = item.status === "proposed" || item.status === "clarify";
            const isClarify = item.status === "clarify";
            const isApplied = item.status === "applied";
            const isRejected = item.status === "rejected";

            const payloadText = item.payload?.text || item.payload?.query || (item.payload?.id ? `ID: ${item.payload.id.slice(0, 10)}...` : "");

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 shadow-sm ${
                  isProposed
                    ? isClarify
                      ? "bg-amber-950/20 border-amber-800/50 hover:border-amber-700/80"
                      : "bg-cyan-950/20 border-cyan-800/50 hover:border-cyan-700/80"
                    : isRejected
                    ? "bg-slate-900/40 border-slate-800/50 opacity-60"
                    : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700/80"
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <Icon className="w-3.5 h-3.5 text-violet-400" />
                    <span>{formatActionType(item.type)}</span>
                  </div>

                  {/* Status / Confidence Badge */}
                  {isApplied && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Applied {item.confidence ? `(${Math.round(item.confidence * 100)}%)` : ""}</span>
                    </span>
                  )}
                  {isProposed && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        isClarify
                          ? "bg-amber-950/60 text-amber-300 border-amber-700/60"
                          : "bg-cyan-950/60 text-cyan-300 border-cyan-700/60"
                      }`}
                    >
                      {isClarify ? "⚠️ Needs Clarification" : `⚡ Proposed (${Math.round((item.confidence ?? 0.7) * 100)}%)`}
                    </span>
                  )}
                  {isRejected && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                      Dismissed
                    </span>
                  )}
                </div>

                {/* Content Payload Preview */}
                {payloadText && (
                  <p className="text-xs text-slate-300 font-medium leading-snug line-clamp-2">
                    {payloadText}
                  </p>
                )}

                {/* Reason Explanation */}
                {item.reason && (
                  <p className="text-[11px] text-slate-400 italic">
                    "{item.reason}"
                  </p>
                )}

                {/* Timestamp & Interactive Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-0.5 text-[11px]">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Pan to Node Trigger */}
                    {item.payload?.id && (
                      <button
                        type="button"
                        onClick={() => canvas?.panToNode?.(item.payload.id)}
                        className="text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Locate on canvas"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Interactive Review Buttons */}
                    {isProposed && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleReject(item.id)}
                          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[10px] font-medium"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(item.id)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-[10px] font-bold shadow-sm flex items-center gap-1"
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>Apply</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
