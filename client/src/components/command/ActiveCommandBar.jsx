import { useState, useRef, useEffect } from "react";
import {
  Command,
  Cpu,
  ArrowRight,
  CornerDownLeft,
  X,
  CheckCircle,
  Lightbulb,
  MapPin,
  AlertTriangle,
  Link2,
  GitFork,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { useRoom } from "../../hooks/useRoom.js";

const PROMPT_PILLS = [
  { label: "Tidy architecture", desc: "Organize nodes cleanly", icon: GitFork, prompt: "Tidy architecture" },
  { label: "Turn into roadmap", desc: "Sequence into timeline", icon: MapPin, prompt: "Turn this into a roadmap" },
  { label: "What did we decide?", desc: "Extract key decisions", icon: CheckCircle, prompt: "What did we decide?" },
  { label: "Show dependencies", desc: "Map relationships", icon: Link2, prompt: "Show all dependencies" },
  { label: "Move risks to right", desc: "Group risk factors", icon: AlertTriangle, prompt: "Move risks to the right" },
  { label: "Cluster by theme", desc: "Categorize workspace", icon: Lightbulb, prompt: "Cluster ideas by theme" },
];

export default function ActiveCommandBar({ canvas }) {
  const { socket, roomId } = useRoom();
  const [prompt, setPrompt] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);
  const promptBtnRef = useRef(null);

  // Global Cmd+K / Ctrl+K shortcut & Escape handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (isPromptsOpen) {
          setIsPromptsOpen(false);
        } else if (lastResponse) {
          setLastResponse(null);
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lastResponse, isPromptsOpen]);

  // Handle outside click to dismiss popover
  useEffect(() => {
    if (!isPromptsOpen) return;
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        promptBtnRef.current &&
        !promptBtnRef.current.contains(e.target)
      ) {
        setIsPromptsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPromptsOpen]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isThinking || !socket) return;

    setIsThinking(true);
    setLastResponse(null);
    setIsPromptsOpen(false);

    socket.emit(
      "canvas:command",
      { prompt: cleanPrompt, roomId },
      (ack) => {
        setIsThinking(false);
        if (ack?.success && ack.result) {
          setPrompt("");
          setLastResponse(ack.result);

          // If query produced highlighted nodes, trigger canvas highlight
          if (ack.result.highlightedNodeIds?.length || ack.result.highlightedEdgeIds?.length) {
            canvas?.highlightElements?.(
              ack.result.highlightedNodeIds || [],
              ack.result.highlightedEdgeIds || []
            );
          }
        }
      }
    );
  };

  const handleSelectPrompt = (pillPrompt) => {
    setPrompt(pillPrompt);
    setIsPromptsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <aside aria-label="Active Command Bar" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl flex flex-col items-center gap-2 pointer-events-none">
      {/* Answer Modal / Result Flyout */}
      {lastResponse && (
        <div className="w-full pointer-events-auto backdrop-blur-2xl bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
              <Cpu className="w-3.5 h-3.5" />
              <span>{lastResponse.summary || "AI Workspace Response"}</span>
            </div>
            <button
              type="button"
              onClick={() => setLastResponse(null)}
              aria-label="Close response modal"
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {lastResponse.answer ? (
            <div className="text-sm text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-1">
              <p className="whitespace-pre-wrap">{lastResponse.answer}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {lastResponse.actions?.length
                ? `Applied ${lastResponse.actions.length} action(s) to the workspace.`
                : "Workspace layout updated."}
            </p>
          )}

          {lastResponse.highlightedNodeIds?.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Highlighted {lastResponse.highlightedNodeIds.length} relevant node(s) on canvas</span>
              <button
                type="button"
                onClick={() => canvas?.panToNode?.(lastResponse.highlightedNodeIds[0])}
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Jump to node</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Option 1B: Prompts Popover Menu (Toggled on click) */}
      {isPromptsOpen && (
        <div
          ref={popoverRef}
          className="w-full pointer-events-auto backdrop-blur-2xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-3 text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-violet-400">
              <Command className="w-3.5 h-3.5" />
              <span>Prompt Suggestions</span>
            </div>
            <span className="text-[11px] text-slate-400">Click to fill into command bar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {PROMPT_PILLS.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => handleSelectPrompt(pill.prompt)}
                  className="group flex items-start gap-2.5 p-2 rounded-xl text-left bg-slate-800/40 hover:bg-violet-950/40 border border-slate-800/80 hover:border-violet-500/50 transition-all cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-violet-900/60 text-violet-400 transition-colors shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                      {pill.label}
                    </span>
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-300 truncate">
                      {pill.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The Floating Command Bar */}
      <div className="w-full pointer-events-auto backdrop-blur-2xl bg-slate-900/85 border border-slate-700/70 focus-within:border-violet-500/80 focus-within:shadow-[0_0_30px_rgba(139,92,246,0.35)] rounded-2xl shadow-2xl transition-all duration-200 p-1.5 flex flex-col">
        {/* Skeleton Thinking Loader */}
        {isThinking && (
          <div className="px-4 py-2 flex flex-col gap-1.5 animate-pulse border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs text-violet-400 font-medium">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              <span>Reasoning across workspace canvas...</span>
            </div>
            <div className="h-2 bg-gradient-to-r from-violet-600/30 via-cyan-500/40 to-violet-600/30 rounded-full w-3/4 animate-pulse" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2.5 py-1">
          {/* Prompts Toggle Button inside the bar */}
          <button
            ref={promptBtnRef}
            type="button"
            onClick={() => setIsPromptsOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 ${
              isPromptsOpen
                ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.5)] border border-violet-500"
                : "bg-slate-800/80 hover:bg-slate-700/80 text-violet-300 hover:text-white border border-slate-700/60 hover:border-violet-500/50"
            }`}
            title="View prompt suggestions"
          >
            <Command className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Prompts</span>
            {isPromptsOpen ? (
              <ChevronDown className="w-3 h-3 opacity-80" />
            ) : (
              <ChevronUp className="w-3 h-3 opacity-80" />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isThinking}
            placeholder="Ask your workspace... (e.g. 'Turn this into a roadmap', 'What did we decide?')"
            className="flex-1 bg-transparent border-none text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-0 disabled:opacity-50 min-w-0"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-sm">
              ⌘K
            </kbd>

            <button
              type="submit"
              disabled={!prompt.trim() || isThinking}
              aria-label="Submit workspace command"
              className="p-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white transition-all shadow-md active:scale-95"
            >
              <CornerDownLeft className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
