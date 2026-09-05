import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowRight, CornerDownLeft, X, CheckCircle, Lightbulb, MapPin, AlertTriangle, Link2 } from "lucide-react";
import { useRoom } from "../../hooks/useRoom.js";

const PROMPT_PILLS = [
  { label: "Turn into roadmap", icon: MapPin, prompt: "Turn this into a roadmap" },
  { label: "What did we decide?", icon: CheckCircle, prompt: "What did we decide?" },
  { label: "Show dependencies", icon: Link2, prompt: "Show all dependencies" },
  { label: "Move risks to right", icon: AlertTriangle, prompt: "Move risks to the right" },
  { label: "Cluster by theme", icon: Lightbulb, prompt: "Cluster ideas by theme" },
];

export default function ActiveCommandBar({ canvas }) {
  const { socket, roomId } = useRoom();
  const [prompt, setPrompt] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const inputRef = useRef(null);

  // Global Cmd+K / Ctrl+K shortcut to focus command bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (lastResponse) {
          setLastResponse(null);
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lastResponse]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isThinking || !socket) return;

    setIsThinking(true);
    setLastResponse(null);

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

  const handlePillClick = (pillPrompt) => {
    setPrompt(pillPrompt);
    inputRef.current?.focus();
  };

  return (
    <aside aria-label="Active Command Bar" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl flex flex-col items-center gap-2 pointer-events-none">
      {/* Answer Modal / Result Flyout */}
      {lastResponse && (
        <div className="w-full pointer-events-auto backdrop-blur-2xl bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
              <Sparkles className="w-3.5 h-3.5" />
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

      {/* Suggested Prompt Pills */}
      <div className="w-full flex items-center justify-center gap-1.5 overflow-x-auto py-1 px-2 no-scrollbar pointer-events-auto">
        {PROMPT_PILLS.map((pill) => {
          const Icon = pill.icon;
          return (
            <button
              key={pill.label}
              type="button"
              onClick={() => handlePillClick(pill.prompt)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60 hover:border-violet-500/60 backdrop-blur-md transition-all shadow-md active:scale-95 whitespace-nowrap"
            >
              <Icon className="w-3 h-3 text-violet-400" />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* The Floating Command Bar */}
      <div className="w-full pointer-events-auto backdrop-blur-2xl bg-slate-900/85 border border-slate-700/70 focus-within:border-violet-500/80 focus-within:shadow-[0_0_30px_rgba(139,92,246,0.35)] rounded-2xl shadow-2xl transition-all duration-200 p-1.5 flex flex-col">
        {/* Skeleton Thinking Loader */}
        {isThinking && (
          <div className="px-4 py-2 flex flex-col gap-1.5 animate-pulse border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs text-violet-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Reasoning across workspace canvas...</span>
            </div>
            <div className="h-2 bg-gradient-to-r from-violet-600/30 via-cyan-500/40 to-violet-600/30 rounded-full w-3/4 animate-pulse" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-1.5">
          <Sparkles className={`w-5 h-5 transition-colors ${isThinking ? "text-violet-400 animate-spin" : "text-slate-400"}`} />
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isThinking}
            placeholder="✨ Ask your workspace... (e.g. 'Turn this into a roadmap', 'What did we decide?')"
            className="flex-1 bg-transparent border-none text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-0 disabled:opacity-50"
          />

          <div className="flex items-center gap-1.5">
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
