import { useState, useEffect, useRef } from "react";
import {
  Activity,
  Zap,
  X,
  Check,
  Ban,
  Clock,
  ExternalLink,
  Target,
  Lightbulb,
  CheckSquare,
  AlertTriangle,
  Link2,
  HelpCircle,
  Move,
  MessageSquareQuote,
  Send,
  Trash2,
  Mic,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useAIActions } from "../../hooks/useAIActions.js";
import { useRoom } from "../../hooks/useRoom.js";
import { getUserColor, getUserInitials } from "../../utils/colors.js";

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

export default function ActivityStream({
  canvas,
  aiActivity: externalAIActivity,
  activeInterim = "",
  isListening = false,
}) {
  const localAIActivity = useAIActions();
  const { actions, isLoading, proposedCount, approveAction, rejectAction } =
    externalAIActivity || localAIActivity;
  const { transcripts = [], addTranscript, clearTranscripts, currentUser } = useRoom();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("transcript"); // "activity" | "transcript"
  const [filter, setFilter] = useState("all"); // "all" | "applied" | "proposed"
  const [typedMessage, setTypedMessage] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  const filteredActions = actions.filter((a) => {
    if (filter === "applied") return a.status === "applied";
    if (filter === "proposed") return a.status === "proposed" || a.status === "clarify";
    return true;
  });

  // Auto-scroll transcript container to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === "transcript" && isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcripts, activeInterim, activeTab, isOpen, isMinimized]);

  const handleApprove = (actionId) => {
    approveAction(actionId);
  };

  const handleReject = (actionId) => {
    rejectAction(actionId);
  };

  const handleSendTypedMessage = (e) => {
    e?.preventDefault();
    const clean = typedMessage.trim();
    if (!clean) return;
    addTranscript?.(clean);
    setTypedMessage("");
  };

  // State 1: Floating trigger pill when completely closed
  if (!isOpen) {
    return (
      <aside
        aria-label="Open Live Transcript"
        className="fixed top-18 right-6 z-40 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-surface/90 hover:bg-surface-hover border border-border-subtle hover:border-violet-300 backdrop-blur-2xl shadow-elevated text-xs font-semibold text-text-main transition-all cursor-pointer group active:scale-95"
          title="Open Live Transcript & Activity"
        >
          <MessageSquareQuote className="w-4 h-4 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform" />
          <span>Transcript</span>
          {transcripts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-violet-100 text-violet-800 border border-violet-200 dark:bg-violet-600/30 dark:text-violet-300 dark:border-violet-500/40">
              {transcripts.length}
            </span>
          )}
          {proposedCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-cyan-800 bg-cyan-100 px-1.5 py-0.2 rounded-full border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/50">
              <Zap className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
              <span>{proposedCount}</span>
            </span>
          )}
        </button>
      </aside>
    );
  }

  // State 2: Floating Minimized Pill on Right Side
  if (isMinimized) {
    return (
      <aside
        aria-label="Activity & Live Transcript (Minimized)"
        className="fixed top-18 right-6 z-40 flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-2xl shadow-elevated animate-in fade-in zoom-in-95 duration-150 text-text-main pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("transcript");
            setIsMinimized(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-subtle cursor-pointer active:scale-95"
        >
          <MessageSquareQuote className="w-3.5 h-3.5" />
          <span>Transcript</span>
          {transcripts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
              {transcripts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("activity");
            setIsMinimized(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover text-xs font-medium cursor-pointer transition-colors active:scale-95"
        >
          <Activity className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span>Activity</span>
          {proposedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500 text-white font-bold">
              {proposedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors cursor-pointer"
          title="Expand floating panel"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-xl text-text-muted hover:text-rose-600 hover:bg-surface-hover transition-colors cursor-pointer"
          title="Close to pill"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Activity & Live Transcript Floating Panel"
      className="fixed top-18 right-6 z-40 w-[calc(100%-3rem)] sm:w-92 h-[520px] max-h-[calc(100vh-6rem)] bg-surface/95 border border-border-subtle rounded-3xl backdrop-blur-2xl shadow-elevated flex flex-col overflow-hidden text-text-main animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Primary Floating Header with Tab Switcher & Window Controls */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle bg-surface-subtle/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1 bg-surface p-1 rounded-2xl border border-border-subtle">
          <button
            type="button"
            onClick={() => setActiveTab("transcript")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "transcript"
                ? "bg-violet-600 text-white shadow-subtle"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Transcript</span>
            {transcripts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-black/20 text-white font-mono">
                {transcripts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "activity"
                ? "bg-violet-600 text-white shadow-subtle"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity</span>
            {proposedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500 text-white">
                {proposedCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            aria-label="Minimize floating panel"
            className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors cursor-pointer"
            title="Minimize to floating pill"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close floating panel"
            className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: AI ACTIVITY ===================== */}
      {activeTab === "activity" && (
        <>
          {/* Sub Filter Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border-subtle bg-surface-subtle text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === "all" ? "bg-surface text-text-main shadow-subtle border border-border-subtle" : "text-text-muted hover:text-text-main"
              }`}
            >
              All ({actions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("proposed")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === "proposed"
                  ? "bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/50"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              Needs Review ({proposedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("applied")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === "applied" ? "bg-surface text-text-main shadow-subtle border border-border-subtle" : "text-text-muted hover:text-text-main"
              }`}
            >
              Applied
            </button>
          </div>

          {/* Action List with Skeleton Loader */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {isLoading ? (
              <div className="flex flex-col gap-3 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-surface-hover rounded w-1/3" />
                      <div className="h-3 bg-surface-hover rounded w-1/4" />
                    </div>
                    <div className="h-4 bg-surface-hover rounded w-3/4" />
                    <div className="h-2 bg-surface-hover rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-faint">
                <Activity className="w-8 h-8 mb-2 opacity-30 text-violet-600 dark:text-violet-400" />
                <p className="text-sm font-medium text-text-main">No activity recorded yet</p>
                <p className="text-xs mt-1 text-text-muted">
                  Run commands via the Command Bar (⌘K) or speak via microphone to populate the canvas.
                </p>
              </div>
            ) : (
              filteredActions.map((item) => {
                const Icon = ACTION_ICONS[item.type] || Activity;
                const isProposed = item.status === "proposed" || item.status === "clarify";
                const isClarify = item.status === "clarify";
                const isApplied = item.status === "applied";
                const isRejected = item.status === "rejected";

                const payloadText =
                  item.payload?.text ||
                  item.payload?.query ||
                  (item.payload?.id ? `ID: ${item.payload.id.slice(0, 10)}...` : "");

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 shadow-subtle ${
                      isProposed
                        ? isClarify
                          ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800/50"
                          : "bg-cyan-50/80 border-cyan-300 dark:bg-cyan-950/20 dark:border-cyan-800/50"
                        : isRejected
                        ? "bg-surface-subtle border-border-subtle opacity-60"
                        : "bg-surface border-border-subtle hover:border-border-strong"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-text-main">
                        <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        <span>{formatActionType(item.type)}</span>
                      </div>

                      {/* Status / Confidence Badge */}
                      {isApplied && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Applied {item.confidence ? `(${Math.round(item.confidence * 100)}%)` : ""}</span>
                        </span>
                      )}
                      {isProposed && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            isClarify
                              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60"
                              : "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700/60"
                          }`}
                        >
                          {isClarify
                            ? "⚠️ Needs Clarification"
                            : `⚡ Proposed (${Math.round((item.confidence ?? 0.7) * 100)}%)`}
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-subtle text-text-muted">
                          Dismissed
                        </span>
                      )}
                    </div>

                    {/* Content Payload Preview */}
                    {payloadText && (
                      <p className="text-xs text-text-main font-medium leading-snug line-clamp-2">
                        {payloadText}
                      </p>
                    )}

                    {/* Reason Explanation */}
                    {item.reason && (
                      <p className="text-[11px] text-text-muted italic">
                        "{item.reason}"
                      </p>
                    )}

                    {/* Timestamp & Interactive Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle mt-0.5 text-[11px]">
                      <div className="flex items-center gap-1 text-text-faint">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(item.createdAt || Date.now()).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.payload?.id && (
                          <button
                            type="button"
                            onClick={() => canvas?.panToNode?.(item.payload.id)}
                            className="text-text-muted hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Locate on canvas"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isProposed && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleReject(item.id)}
                              className="px-2 py-1 rounded-md bg-surface-subtle hover:bg-surface-hover text-text-muted hover:text-text-main border border-border-subtle transition-colors text-[10px] font-medium cursor-pointer"
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-[10px] font-bold shadow-sm flex items-center gap-1 cursor-pointer"
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
        </>
      )}

      {/* ===================== TAB 2: LIVE TRANSCRIPT ===================== */}
      {activeTab === "transcript" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Subheader Status Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-subtle text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isListening ? "bg-emerald-500 animate-ping" : "bg-text-faint"}`} />
              <span className="font-semibold text-text-main">
                {isListening ? "Listening Live" : "Mic Inactive"}
              </span>
              <span className="text-[10px] text-text-muted">
                ({transcripts.length} entries)
              </span>
            </div>

            {transcripts.length > 0 && (
              <button
                type="button"
                onClick={clearTranscripts}
                className="text-[11px] text-text-muted hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear transcript history"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Transcript Message Scroll View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {transcripts.length === 0 && !activeInterim ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-faint">
                <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center mb-3 text-text-muted">
                  <Mic className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-text-main">No speech recorded yet</p>
                <p className="text-xs mt-1.5 text-text-muted max-w-xs leading-relaxed">
                  Turn on your microphone (<kbd className="px-1 py-0.5 text-[10px] bg-surface border border-border-subtle rounded text-text-main font-mono">M</kbd>) or type below. Everything spoken by anyone in the room will appear here in real-time.
                </p>
              </div>
            ) : (
              <>
                {transcripts.map((entry) => {
                  const speakerColor = getUserColor(entry.speaker || "Participant");
                  const isLocalSpeaker = entry.userId === currentUser?.id || entry.speaker === currentUser?.name;

                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-2xl bg-surface border border-border-subtle hover:border-border-strong transition-all flex flex-col gap-1.5 shadow-subtle"
                    >
                      {/* Speaker header */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: speakerColor }}
                          >
                            {getUserInitials(entry.speaker || "User")}
                          </div>
                          <span className="font-semibold text-text-main truncate">
                            {entry.speaker}
                          </span>
                          {isLocalSpeaker && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-subtle border border-border-subtle text-text-muted">
                              You
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-text-faint font-mono shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {entry.timestamp}
                        </span>
                      </div>

                      {/* Utterance Text */}
                      <p className="text-xs text-text-muted leading-relaxed pl-7 break-words">
                        {entry.text}
                      </p>
                    </div>
                  );
                })}

                {/* Real-time Interim Live Speaking Card */}
                {isListening && activeInterim && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs shadow-subtle animate-pulse dark:bg-emerald-950/20 dark:border-emerald-500/40">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        {currentUser?.name || "You"} (Speaking...)
                      </span>
                    </div>
                    <p className="text-text-main italic font-medium pl-4">
                      "{activeInterim}"
                    </p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick Note / Transcript Input Bar */}
          <form
            onSubmit={handleSendTypedMessage}
            className="p-3 border-t border-border-subtle bg-surface-subtle flex items-center gap-2"
          >
            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              placeholder="Type into transcript or speak (M)..."
              className="flex-1 bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-main placeholder:text-text-faint focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={!typedMessage.trim()}
              className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              title="Post message to room transcript"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
