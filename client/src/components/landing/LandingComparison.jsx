import { Check, X, Video, FileText } from "lucide-react";
import BrandLogo from "../ui/BrandLogo.jsx";

export default function LandingComparison() {
  return (
    <section id="compare" className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 select-none scroll-mt-24">
      <div className="text-center space-y-2">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          The Comparison
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-text-main tracking-tight">
          Why teams switch to mindMesh
        </h2>
        <p className="text-text-muted text-xs sm:text-sm max-w-lg mx-auto">
          Meetings shouldn't require one person sacrificing their focus to type manual notes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* Column 1: mindMesh (The Highlighted Winner) */}
        <div className="relative p-6 rounded-2xl sm:rounded-3xl bg-surface border-2 border-indigo-500/80 shadow-elevated flex flex-col justify-between space-y-6 ring-1 ring-indigo-500/20 order-1 lg:order-2">
          {/* Top badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-[10px] tracking-wide uppercase shadow-md shadow-indigo-500/20">
            Recommended
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <BrandLogo className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main tracking-tight">mindMesh</h3>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">AI-Native Living Workspace</span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Dialogue automatically transforms into an authoritative, topological knowledge graph in real time.
            </p>

            <ul className="space-y-2.5 text-xs text-text-main pt-2 border-t border-border-subtle">
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Zero manual typing; AI extracts goals, tasks, decisions &amp; risks</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Live 60fps infinite hardware canvas with hierarchical auto-layout</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Dual-engine verification for zero dropped meeting thoughts</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>1-click meeting commit to Slack Block Kit, Notion &amp; Email</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Frictionless guest rooms + cloud synchronization</span>
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-center text-xs font-bold tracking-tight shadow-md shadow-indigo-600/25">
            100% Focused on Collaboration
          </div>
        </div>

        {/* Column 2: Video Calls Alone (Zoom / Meet) */}
        <div className="p-6 rounded-2xl bg-surface-subtle border border-border-subtle flex flex-col justify-between space-y-6 shadow-subtle order-2 lg:order-1">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">Video Calls Alone</h3>
                <span className="text-[11px] text-text-muted">Google Meet, Zoom, Teams</span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Great for seeing faces, but conversations vanish the moment you click "End Call".
            </p>

            <ul className="space-y-2.5 text-xs pt-2 border-t border-border-subtle">
              <li className="flex items-start gap-2 text-text-main">
                <div className="p-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Spoken ideas and decisions are lost without manual note-taking</span>
              </li>
              <li className="flex items-start gap-2 text-text-main">
                <div className="p-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Zero visual dependency mapping or spatial arrangement</span>
              </li>
              <li className="flex items-start gap-2 text-text-main">
                <div className="p-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Action items get buried in temporary in-call chat text</span>
              </li>
              <li className="flex items-start gap-2 text-text-main">
                <div className="p-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Follow-ups take hours to compile after the meeting</span>
              </li>
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-surface border border-border-subtle text-center text-xs font-semibold text-text-muted shadow-subtle">
            Ephemeral Conversation
          </div>
        </div>

        {/* Column 3: Whiteboards & Docs Alone (Miro / Notion) */}
        <div className="p-6 rounded-2xl bg-surface-subtle border border-border-subtle flex flex-col justify-between space-y-6 shadow-subtle order-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">Whiteboards &amp; Docs</h3>
                <span className="text-[11px] text-text-muted">Miro, FigJam, Notion</span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Flexible canvases, but requires someone actively halting the discussion to type and drag boxes.
            </p>

            <ul className="space-y-2.5 text-xs pt-2 border-t border-border-subtle">
              <li className="flex items-start gap-2 text-text-main">
                <div className="p-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>High cognitive load: typing distracts from actual collaboration</span>
              </li>
              <li className="flex items-start gap-2 text-text-main">
                <div className="p-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Disorganized webs quickly turn into illegible sticky-note clutter</span>
              </li>
              <li className="flex items-start gap-2 text-text-main">
                <div className="p-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>No live voice speech attribution or automated extraction</span>
              </li>
              <li className="flex items-start gap-2 text-text-main">
                <div className="p-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Requires manual copy-pasting to export to Slack or databases</span>
              </li>
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-surface border border-border-subtle text-center text-xs font-semibold text-text-muted shadow-subtle">
            Manual Labor Required
          </div>
        </div>
      </div>
    </section>
  );
}
