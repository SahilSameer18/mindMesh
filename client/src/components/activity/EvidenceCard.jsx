import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Quote, Clock, User, Target, Lightbulb, CheckSquare, CheckCircle2, HelpCircle, AlertTriangle, ArrowUpRight } from "lucide-react";
import { NODE_CONFIGS, NODE_TYPES } from "../../utils/canvasConstants.js";

const ICON_MAP = {
  Target,
  Lightbulb,
  CheckSquare,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  User,
};

export default function EvidenceCard({ node, aiAction, onClose, onPanToNode }) {
  if (!node) return null;

  const config = NODE_CONFIGS[node.type] || NODE_CONFIGS[NODE_TYPES.IDEA];
  const IconComponent = ICON_MAP[config.icon] || Lightbulb;

  const evidence = node.metadata?.evidence || {};

  // 1. Precise speaker attribution
  const speaker =
    evidence.speaker ||
    node.metadata?.assignee ||
    (aiAction?.reason?.match(/(?:by|for|assigned to)\s+([A-Z][a-z]+)/i)?.[1]) ||
    "Meeting Participant";

  // 2. Exact quote resolution: prioritize Phase 3 ontology (metadata.sourceQuote)
  // Strictly do NOT fall back to node.text (which creates an echo illusion)
  const quote =
    node.metadata?.sourceQuote ||
    evidence.sourceQuote ||
    evidence.quote ||
    node.metadata?.quote ||
    aiAction?.payload?.metadata?.sourceQuote ||
    null;

  // 3. Real reason from AIAction row in database
  const reason =
    aiAction?.reason ||
    evidence.reason ||
    node.metadata?.reason ||
    (node.sourceType === "ai_command"
      ? "Synthesized by AI Active Command Bar instruction."
      : "Extracted by AI intelligence from collaborative discussion dialogue.");

  const timestamp =
    evidence.timestamp ||
    node.metadata?.timestamp ||
    (aiAction?.createdAt
      ? new Date(aiAction.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null) ||
    new Date(node.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl border shadow-sm flex items-center justify-center"
              style={{
                backgroundColor: `${config.color}20`,
                borderColor: `${config.color}50`,
                color: config.color,
              }}
            >
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold tracking-wider uppercase text-violet-400">Why This Exists</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 capitalize">{node.type || "Concept"} Explanation</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Target Element Preview */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-mono uppercase text-slate-500 block mb-1">Canvas Element</span>
            <p className="text-sm font-medium text-slate-100 leading-snug">{node.text || "Untitled node"}</p>
          </div>

          {/* AI Rationale from Database AIAction */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Reasoning</span>
            <p className="text-sm text-slate-300 leading-relaxed bg-violet-950/20 border border-violet-800/30 p-3 rounded-xl text-violet-200/90">
              {reason}
            </p>
          </div>

          {/* Source Transcript Quote (rendered only when real quote exists) */}
          {quote ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Source Transcript Evidence</span>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5">
                  <Quote className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-sm italic text-cyan-100/90 leading-relaxed font-serif">
                    "{quote}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold">
                      {speaker.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-300">{speaker}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
              <span>Origin: {node.sourceType || "AI Workspace Action"}</span>
              {aiAction?.confidence && (
                <span className="text-cyan-400 font-mono">
                  Confidence: {Math.round(aiAction.confidence * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onPanToNode?.(node.id);
              onClose?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors shadow-sm"
          >
            <span>Jump to node on canvas</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
