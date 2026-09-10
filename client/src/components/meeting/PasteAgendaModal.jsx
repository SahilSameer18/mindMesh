import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ListOrdered, Sparkles, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { aiApi } from "../../api/ai.api.js";

const SAMPLE_AGENDA = `1. WebRTC P2P Mesh Video Calling & Low-Latency Signaling Relay
2. Dual-Engine LLM Failover & Real-Time Context Priming
3. Canvas Spatial Organization & Vertical Topic Cascading
4. Production Hardening, Session Security & Load Testing`;

export default function PasteAgendaModal({ isOpen, onClose, roomId }) {
  const [agendaText, setAgendaText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleFillSample = () => {
    setAgendaText(SAMPLE_AGENDA);
    toast.info("Sample agenda outline inserted");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanText = agendaText.trim();
    if (!cleanText) {
      toast.error("Please enter or paste your meeting agenda.");
      return;
    }
    if (cleanText.length < 15) {
      toast.error("Agenda text is too short. Please provide at least 15 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await aiApi.generateAgenda(roomId, cleanText);
      if (res.success) {
        const count = res.data?.topics?.length || 0;
        toast.success(`Anchored ${count} topic pillars to your canvas!`);
        setAgendaText("");
        onClose();
      } else {
        toast.error(res.message || "Failed to generate agenda topics.");
      }
    } catch (err) {
      console.error("[PasteAgendaModal] Error generating agenda:", err);
      toast.error(err.response?.data?.message || err.message || "Could not generate agenda topics.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-text-main/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-surface border border-border-subtle rounded-2xl sm:rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-elevated space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer disabled:opacity-40"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center shrink-0">
              <ListOrdered className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-text-main tracking-tight">
              Import Meeting Agenda
            </h3>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Paste meeting notes or document outline. Echo will extract 3–5 strategic topic pillars and anchor them across the top of your canvas so spoken tasks cascade vertically underneath.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-text-main">
                Agenda Outline or Notes
              </label>
              <button
                type="button"
                onClick={handleFillSample}
                disabled={isSubmitting}
                className="flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 hover:underline cursor-pointer disabled:opacity-40"
              >
                <BookOpen className="w-3 h-3" />
                <span>Insert Sample Outline</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={5}
              value={agendaText}
              onChange={(e) => setAgendaText(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g.&#10;1. Authentication & Session Cookies&#10;2. WebRTC Peer-to-Peer Video Signaling&#10;3. Canvas Edge Clustering & Real-Time Sync&#10;4. Production Deployment & Monitoring"
              className="w-full p-3 rounded-xl bg-surface-subtle border border-border-subtle text-sm text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-violet-500 font-sans leading-relaxed resize-none disabled:opacity-50"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  handleSubmit(e);
                }
              }}
            />

            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>Press <kbd className="font-mono text-[10px] px-1 py-0.5 bg-surface rounded border border-border-subtle">Ctrl+Enter</kbd> to submit</span>
              <span>{agendaText.length} characters</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || agendaText.trim().length < 15}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-white text-xs font-semibold shadow-md shadow-violet-600/25 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Pillars...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Topic Anchors</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
