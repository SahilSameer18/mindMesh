import { useState, useEffect, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { useRoom } from "../../hooks/useRoom.js";
import {
  Sparkles,
  CheckCircle2,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ListTodo,
  HelpCircle,
  Share2,
  Send,
  AlertTriangle,
  X,
  RotateCw,
  Clock,
  User,
  Tag,
  Layers,
  ShieldCheck,
  CheckSquare,
  Square,
  Zap,
} from "lucide-react";

export default function CommitCallModal({ isOpen, onClose, canvas }) {
  const {
    roomId,
    latestMeetingReport,
    commitMeeting,
    exportReport,
    fetchLatestReport,
    fetchRoomIntegrations,
    isCommitting,
    commitError,
    setCommitError,
  } = useRoom();

  const [activeTab, setActiveTab] = useState("summary");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [exportStates, setExportStates] = useState({});
  const [synthesisStep, setSynthesisStep] = useState(0);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [recipientEmail, setRecipientEmail] = useState("");
  const [slackWebhookOverride, setSlackWebhookOverride] = useState("");
  const [notionDbOverride, setNotionDbOverride] = useState("");

  // Multi-phase progress messages during AI synthesis
  const SYNTHESIS_STEPS = [
    "Reading speech transcripts and active canvas state...",
    "Applying Canvas-over-Transcript truth hierarchy...",
    "Extracting ratified decisions & consensus commitments...",
    "Synthesizing structured executive briefing...",
    "Finalizing authoritative meeting milestone...",
  ];

  // Confetti explosion trigger
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#38bdf8", "#818cf8", "#c084fc", "#f43f5e", "#fbbf24"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 250);
    } catch (e) {
      console.warn("Confetti effect failed:", e);
    }
  }, []);

  // Fetch latest report and stored integrations when modal opens to re-hydrate state across sessions/peers
  useEffect(() => {
    if (isOpen) {
      fetchLatestReport?.();
      fetchRoomIntegrations?.().then((integrations) => {
        if (Array.isArray(integrations)) {
          setExportStates((prev) => {
            const next = { ...prev };
            for (const integ of integrations) {
              if (integ.config?.lastStatus && !next[integ.provider]) {
                const isSimulated = integ.config.lastStatus === "simulated";
                next[integ.provider] = {
                  loading: false,
                  success: true,
                  simulated: isSimulated,
                  message: isSimulated
                    ? `🧪 SIMULATED DISPATCH: Prior export recorded (${integ.provider})`
                    : `✅ DELIVERED: Prior export recorded (${integ.provider})`,
                  timestamp: integ.config.lastExportAt
                    ? new Date(integ.config.lastExportAt).toLocaleTimeString()
                    : undefined,
                };
              }
            }
            return next;
          });
        }
      });
    }
  }, [isOpen, fetchLatestReport, fetchRoomIntegrations]);

  // Advance synthesis step messages during committing
  useEffect(() => {
    if (!isCommitting) {
      setSynthesisStep(0);
      return;
    }

    const interval = setInterval(() => {
      setSynthesisStep((prev) => (prev < SYNTHESIS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(interval);
  }, [isCommitting, SYNTHESIS_STEPS.length]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isCommitting) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCommitting, onClose]);

  const report = latestMeetingReport;

  // Re-hydrate email export if report recorded emailedTo
  useEffect(() => {
    if (report?.emailedTo) {
      setExportStates((prev) => {
        if (prev.email) return prev;
        return {
          ...prev,
          email: {
            loading: false,
            success: true,
            simulated: false,
            message: `✅ DELIVERED: Emailed to ${report.emailedTo}`,
            timestamp: report.createdAt
              ? new Date(report.createdAt).toLocaleTimeString()
              : undefined,
          },
        };
      });
    }
  }, [report?.emailedTo, report?.createdAt]);

  // Handle Commit Trigger
  const handleRunCommit = async () => {
    try {
      setCommitError?.(null);
      const generated = await commitMeeting({
        title: meetingTitle.trim() || undefined,
      });
      if (generated) {
        triggerCelebration();
        setActiveTab("summary");
      }
    } catch (err) {
      console.error("Commit meeting failed:", err);
    }
  };

  // Copy helper with visual checkmark
  const handleCopy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Export Dispatcher (Slack, Notion, Email)
  const handleExport = async (provider) => {
    if (!report?.id) return;

    setExportStates((prev) => ({
      ...prev,
      [provider]: { loading: true, error: null },
    }));

    try {
      const payload = { provider, config: {} };
      if (provider === "slack" && slackWebhookOverride.trim()) {
        payload.config.webhookUrl = slackWebhookOverride.trim();
      }
      if (provider === "notion" && notionDbOverride.trim()) {
        payload.config.databaseId = notionDbOverride.trim();
      }
      if (provider === "email") {
        payload.recipient = recipientEmail.trim() || "team@mindmesh.local";
      }

      const res = await exportReport(report.id, payload);
      const isSimulated = Boolean(res?.data?.simulated ?? res?.simulated);

      setExportStates((prev) => ({
        ...prev,
        [provider]: {
          loading: false,
          success: res?.success,
          simulated: isSimulated,
          message: res?.message || (res?.success ? "Export completed" : "Export failed"),
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    } catch (err) {
      setExportStates((prev) => ({
        ...prev,
        [provider]: {
          loading: false,
          success: false,
          simulated: false,
          message: err.message || "Export failed",
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    }
  };

  // Download Markdown Report
  const handleDownloadMarkdown = () => {
    if (!report) return;
    const dateStr = new Date(report.createdAt || Date.now()).toISOString().split("T")[0];
    const filename = `mindmesh-summary-${roomId}-${dateStr}.md`;

    let md = `# ${report.title || "mindMesh Meeting Summary"}\n\n`;
    md += `**Room:** \`${roomId}\` | **Date:** ${new Date(report.createdAt || Date.now()).toLocaleString()}\n\n`;
    md += `## Executive Summary\n\n${report.executiveSummary || "N/A"}\n\n`;

    if (report.keyDecisions?.length) {
      md += `## Key Decisions (${report.keyDecisions.length})\n\n`;
      report.keyDecisions.forEach((d, i) => {
        md += `${i + 1}. **${d.decision}**\n`;
        if (d.owner) md += `   - *Owner:* ${d.owner}\n`;
        if (d.context) md += `   - *Context:* ${d.context}\n`;
      });
      md += "\n";
    }

    if (report.actionItems?.length) {
      md += `## Action Items (${report.actionItems.length})\n\n`;
      report.actionItems.forEach((t) => {
        const priority = t.priority ? `[${t.priority.toUpperCase()}]` : "";
        const assignee = t.assignee ? `(@${t.assignee})` : "";
        md += `- [ ] ${priority} ${t.task} ${assignee}\n`;
      });
      md += "\n";
    }

    if (report.unresolvedQuestions?.length) {
      md += `## Unresolved Questions & Risks (${report.unresolvedQuestions.length})\n\n`;
      report.unresolvedQuestions.forEach((q, i) => {
        md += `${i + 1}. **${q.question}**\n`;
        if (q.blockerFor) md += `   - *Blocker for:* ${q.blockerFor}\n`;
        if (q.suggestedFollowup) md += `   - *Follow-up:* ${q.suggestedFollowup}\n`;
      });
      md += "\n";
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={!isCommitting ? onClose : undefined}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {report ? report.title || "Meeting Synthesis & Commit" : "Commit Meeting Call"}
                </h2>
                {report?.cached && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    15s Cooldown Cache
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-slate-300">Room: {roomId}</span>
                {report && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(report.createdAt || Date.now()).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {report && !isCommitting && (
              <button
                type="button"
                onClick={handleRunCommit}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
                title="Re-run dual-source AI synthesis with updated canvas and speech"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Re-commit</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isCommitting}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[360px]">
          {/* Commit Error Banner */}
          {commitError && !isCommitting && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-start justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-rose-100">Synthesis Error: </span>
                  <span className="text-slate-300 break-words">{commitError}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommitError?.(null)}
                className="p-0.5 text-rose-400 hover:text-white rounded"
                title="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STATE 1: Committing / Synthesizing in Progress (Skeleton Loaders - No Raw Spinners) */}
          {isCommitting ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 animate-in fade-in duration-300">
              {/* Pulsing AI Logo & Pipeline Progress */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 flex items-center justify-center shadow-xl shadow-violet-500/30 animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 opacity-30 blur animate-pulse" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Synthesizing Dual-Source Meeting Intelligence
                </h3>
                <p className="text-xs sm:text-sm text-sky-300 font-medium mt-1 animate-pulse">
                  {SYNTHESIS_STEPS[synthesisStep]}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                  Fusing active canvas graph nodes with spoken dialogue transcripts. Canvas consensus
                  takes authoritative precedence over exploratory dialogue.
                </p>
              </div>

              {/* Shimmering Skeleton Cards (Strict Rule: Skeleton loaders over raw spinners) */}
              <div className="w-full space-y-3 pt-2">
                <div className="w-full h-16 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 flex flex-col justify-between relative overflow-hidden animate-pulse">
                  <div className="w-1/3 h-3.5 bg-slate-700/80 rounded" />
                  <div className="w-full h-2.5 bg-slate-700/50 rounded" />
                  <div className="w-4/5 h-2.5 bg-slate-700/40 rounded" />
                </div>
                <div className="w-full h-14 rounded-xl bg-slate-800/40 border border-slate-700/40 p-3 flex items-center justify-between relative overflow-hidden animate-pulse">
                  <div className="w-1/2 h-3 bg-slate-700/60 rounded" />
                  <div className="w-16 h-5 bg-slate-700/40 rounded-full" />
                </div>
                <div className="w-full h-14 rounded-xl bg-slate-800/40 border border-slate-700/40 p-3 flex items-center justify-between relative overflow-hidden animate-pulse">
                  <div className="w-2/3 h-3 bg-slate-700/60 rounded" />
                  <div className="w-14 h-5 bg-slate-700/40 rounded-full" />
                </div>
              </div>
            </div>
          ) : !report ? (
            /* STATE 2: Pre-Commit Preview (No report yet generated) */
            <div className="py-6 px-2 sm:px-6 flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-amber-400 shadow-md">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Ratify Canvas Consensus & Commit Milestone
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  Commit the live room state into an authoritative synthesis. Groq Llama 3.3 70B will
                  fuse the spoken audio transcripts with active canvas nodes and dependencies.
                </p>
              </div>

              {/* Meeting Title Input */}
              <div className="w-full text-left space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Meeting Title (Optional)</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Sprint Planning & Architecture Alignment"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>

              {/* Canvas Metrics Badges */}
              <div className="w-full grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <div className="text-xs text-slate-400 font-medium">Canvas Nodes</div>
                  <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
                    {canvas?.nodes?.length || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <div className="text-xs text-slate-400 font-medium">Relationships</div>
                  <div className="text-lg font-bold text-indigo-400 font-mono mt-0.5">
                    {canvas?.edges?.length || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <div className="text-xs text-slate-400 font-medium">Truth Rule</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-1">Canvas &gt; Audio</div>
                </div>
              </div>

              {/* Primary Commit Action Button */}
              <button
                type="button"
                onClick={handleRunCommit}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 hover:from-amber-400 hover:via-rose-400 hover:to-violet-500 text-white shadow-xl shadow-violet-500/25 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Synthesis &amp; Commit Meeting</span>
              </button>
            </div>
          ) : (
            /* STATE 3: Authoritative Report Generated (Tabbed Navigation) */
            <div className="space-y-4">
              {/* Tab Navigation Bar */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 overflow-x-auto scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeTab === "summary"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Executive Summary</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("decisions")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeTab === "decisions"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Key Decisions</span>
                  {report.keyDecisions?.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/30 text-emerald-200 font-mono">
                      {report.keyDecisions.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("tasks")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeTab === "tasks"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>Action Items</span>
                  {report.actionItems?.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200 font-mono">
                      {report.actionItems.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("questions")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeTab === "questions"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Open Questions</span>
                  {report.unresolvedQuestions?.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200 font-mono">
                      {report.unresolvedQuestions.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("export")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeTab === "export"
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Export Hub</span>
                </button>
              </div>

              {/* TAB 1: EXECUTIVE SUMMARY */}
              {activeTab === "summary" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 relative">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Executive Synthesis
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy("summary", report.executiveSummary)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-300 transition-colors"
                      >
                        {copiedKey === "summary" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === "summary" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    <div className="text-sm leading-relaxed text-slate-200 space-y-3 font-sans">
                      {report.executiveSummary ? (
                        report.executiveSummary
                          .split("\n\n")
                          .map((para, idx) => <p key={idx}>{para}</p>)
                      ) : (
                        <p className="italic text-slate-400">No executive summary available.</p>
                      )}
                    </div>

                    {/* Tags List */}
                    {report.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-4 mt-4 border-t border-slate-800/60">
                        {report.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/90 text-slate-300 border border-slate-700/60"
                          >
                            <Tag className="w-2.5 h-2.5 text-sky-400" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: KEY DECISIONS */}
              {activeTab === "decisions" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {report.keyDecisions?.length > 0 ? (
                    report.keyDecisions.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-semibold text-white leading-snug">
                                {item.decision}
                              </h4>
                              {item.context && (
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {item.context}
                                </p>
                              )}
                            </div>
                          </div>

                          {item.owner && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                              @{item.owner}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No explicit key decisions ratified on the canvas.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ACTION ITEMS */}
              {activeTab === "tasks" && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  {report.actionItems?.length > 0 ? (
                    report.actionItems.map((task, idx) => {
                      const isDone = completedTaskIds.has(idx);
                      const priorityColor =
                        task.priority === "high"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : task.priority === "medium"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700";

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setCompletedTaskIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(idx)) next.delete(idx);
                                  else next.add(idx);
                                  return next;
                                });
                              }}
                              className="text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                            >
                              {isDone ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>

                            <span
                              className={`text-sm font-medium truncate ${
                                isDone ? "line-through text-slate-500" : "text-slate-100"
                              }`}
                            >
                              {task.task}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.priority && (
                              <span
                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${priorityColor}`}
                              >
                                {task.priority}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                                @{task.assignee}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No action items or commitments found.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: UNRESOLVED QUESTIONS & RISKS */}
              {activeTab === "questions" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {report.unresolvedQuestions?.length > 0 ? (
                    report.unresolvedQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 hover:border-amber-500/50 transition-colors space-y-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          <h4 className="text-sm font-semibold text-slate-100">{q.question}</h4>
                        </div>

                        {q.blockerFor && (
                          <div className="text-xs text-slate-400 pl-6.5 flex items-center gap-1.5">
                            <span className="text-rose-400 font-medium">Blocker:</span>
                            <span>{q.blockerFor}</span>
                          </div>
                        )}

                        {q.suggestedFollowup && (
                          <div className="text-xs text-slate-300 pl-6.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex items-start gap-1.5">
                            <span className="text-amber-300 font-medium shrink-0">Suggested:</span>
                            <span>{q.suggestedFollowup}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Zero blockers or unresolved questions flagged.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: EXPORT HUB */}
              {activeTab === "export" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Slack Block Kit Dispatch */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="text-base">💬</span> Slack Webhook
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            Block Kit
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Dispatches formatted summary blocks to configured Slack room channel.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={slackWebhookOverride}
                          onChange={(e) => setSlackWebhookOverride(e.target.value)}
                          placeholder="Optional: https://hooks.slack.com/..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 outline-none"
                        />
                        <button
                          type="button"
                          disabled={exportStates.slack?.loading}
                          onClick={() => handleExport("slack")}
                          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          <span>
                            {exportStates.slack?.loading ? "Dispatching..." : "Send to Slack"}
                          </span>
                        </button>
                      </div>

                      {/* Status Banner */}
                      {exportStates.slack && (
                        <div
                          className={`p-2 rounded-lg text-xs font-medium border flex items-start gap-1.5 ${
                            exportStates.slack.simulated
                              ? "bg-amber-950/40 text-amber-200 border-amber-500/50"
                              : exportStates.slack.success
                              ? "bg-emerald-950/40 text-emerald-200 border-emerald-500/50"
                              : "bg-rose-950/40 text-rose-200 border-rose-500/50"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <div>
                              {exportStates.slack.simulated
                                ? "🧪 SIMULATED DISPATCH: Webhook logged to server console (Set SLACK_WEBHOOK_URL in .env for live post)"
                                : exportStates.slack.message}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {exportStates.slack.timestamp}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notion Database Dispatch */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="text-base">📝</span> Notion Database
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            Pages API
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Creates structured meeting notes page with task blocks in your Notion database.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={notionDbOverride}
                          onChange={(e) => setNotionDbOverride(e.target.value)}
                          placeholder="Optional: Notion Database ID"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 outline-none"
                        />
                        <button
                          type="button"
                          disabled={exportStates.notion?.loading}
                          onClick={() => handleExport("notion")}
                          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          <span>
                            {exportStates.notion?.loading ? "Syncing..." : "Sync to Notion"}
                          </span>
                        </button>
                      </div>

                      {/* Status Banner */}
                      {exportStates.notion && (
                        <div
                          className={`p-2 rounded-lg text-xs font-medium border flex items-start gap-1.5 ${
                            exportStates.notion.simulated
                              ? "bg-amber-950/40 text-amber-200 border-amber-500/50"
                              : exportStates.notion.success
                              ? "bg-emerald-950/40 text-emerald-200 border-emerald-500/50"
                              : "bg-rose-950/40 text-rose-200 border-rose-500/50"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <div>
                              {exportStates.notion.simulated
                                ? "🧪 SIMULATED DISPATCH: Page payload logged to server console (Set NOTION_TOKEN in .env for live sync)"
                                : exportStates.notion.message}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {exportStates.notion.timestamp}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resend Email Dispatch */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="text-base">✉️</span> Resend Email
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            HTML Brief
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Sends responsive dark-mode executive briefing to attendees.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="Recipient email (default: team@mindmesh.local)"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 outline-none"
                        />
                        <button
                          type="button"
                          disabled={exportStates.email?.loading}
                          onClick={() => handleExport("email")}
                          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          <span>
                            {exportStates.email?.loading ? "Sending..." : "Send Email Briefing"}
                          </span>
                        </button>
                      </div>

                      {/* Status Banner */}
                      {exportStates.email && (
                        <div
                          className={`p-2 rounded-lg text-xs font-medium border flex items-start gap-1.5 ${
                            exportStates.email.simulated
                              ? "bg-amber-950/40 text-amber-200 border-amber-500/50"
                              : exportStates.email.success
                              ? "bg-emerald-950/40 text-emerald-200 border-emerald-500/50"
                              : "bg-rose-950/40 text-rose-200 border-rose-500/50"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <div>
                              {exportStates.email.simulated
                                ? "🧪 SIMULATED DISPATCH: Email logged to server console (Set RESEND_API_KEY in .env for live transmission)"
                                : exportStates.email.message}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {exportStates.email.timestamp}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Markdown & JSON Download Actions */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="text-base">📄</span> Local Files
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            Download
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Export complete meeting report as markdown file or copy raw JSON.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleDownloadMarkdown}
                          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                          <span>Download Markdown (.md)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy("json", JSON.stringify(report, null, 2))
                          }
                          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center justify-center gap-1.5"
                        >
                          {copiedKey === "json" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedKey === "json" ? "JSON Copied!" : "Copy Raw JSON"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-slate-300">
              Provider: {report?.provider || "groq/llama-3.3-70b"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {report && (
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="hover:text-sky-300 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Download .md</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
