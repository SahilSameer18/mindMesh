import { Check, X, Video, FileText } from "lucide-react";
import BrandLogo from "../ui/BrandLogo.jsx";

export default function LandingComparison() {
  return (
    <section id="compare" className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 select-none scroll-mt-24">
      <div className="text-center space-y-2">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
          The Comparison
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
          Why teams switch to mindMesh
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          Meetings shouldn't require one person sacrificing their focus to type manual notes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* Column 1: mindMesh (The Highlighted Winner) */}
        <div className="relative p-6 rounded-2xl sm:rounded-3xl bg-slate-900/90 border-2 border-indigo-500/80 shadow-2xl shadow-indigo-500/15 flex flex-col justify-between space-y-6 ring-1 ring-white/10 order-1 lg:order-2">
          {/* Top badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-[10px] tracking-wide uppercase shadow-md shadow-indigo-500/30">
            Recommended
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <BrandLogo className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">mindMesh</h3>
                <span className="text-[11px] text-indigo-300 font-medium">AI-Native Living Workspace</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Dialogue automatically transforms into an authoritative, topological knowledge graph in real time.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-slate-800">
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Zero manual typing; AI extracts goals, tasks, decisions & risks</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Live 60fps infinite hardware canvas with hierarchical auto-layout</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Dual-engine verification for zero dropped meeting thoughts</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>1-click meeting commit to Slack Block Kit, Notion & Email</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Frictionless guest rooms + cloud synchronization</span>
              </li>
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-center text-xs font-semibold text-indigo-200">
            100% Focused on Collaboration
          </div>
        </div>

        {/* Column 2: Video Calls Alone (Zoom / Meet) */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-6 backdrop-blur-xl order-2 lg:order-1">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Video Calls Alone</h3>
                <span className="text-[11px] text-slate-400">Google Meet, Zoom, Teams</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Great for seeing faces, but conversations vanish the moment you click "End Call".
            </p>

            <ul className="space-y-2.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <li className="flex items-start gap-2 text-rose-300/80">
                <div className="p-0.5 rounded bg-rose-500/15 text-rose-400 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Spoken ideas and decisions are lost without manual note-taking</span>
              </li>
              <li className="flex items-start gap-2 text-rose-300/80">
                <div className="p-0.5 rounded bg-rose-500/15 text-rose-400 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Zero visual dependency mapping or spatial arrangement</span>
              </li>
              <li className="flex items-start gap-2 text-rose-300/80">
                <div className="p-0.5 rounded bg-rose-500/15 text-rose-400 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Action items get buried in temporary in-call chat text</span>
              </li>
              <li className="flex items-start gap-2 text-rose-300/80">
                <div className="p-0.5 rounded bg-rose-500/15 text-rose-400 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Follow-ups take hours to compile after the meeting</span>
              </li>
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 text-center text-xs font-medium text-slate-400">
            Ephemeral Conversation
          </div>
        </div>

        {/* Column 3: Whiteboards & Docs Alone (Miro / Notion) */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-6 backdrop-blur-xl order-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Whiteboards & Docs</h3>
                <span className="text-[11px] text-slate-400">Miro, FigJam, Notion</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Flexible canvases, but requires someone actively halting the discussion to type and drag boxes.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <li className="flex items-start gap-2 text-rose-300/80">
                <div className="p-0.5 rounded bg-rose-500/15 text-rose-400 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>High cognitive load: typing distracts from actual collaboration</span>
              </li>
              <li className="flex items-start gap-2 text-rose-300/80">
                <div className="p-0.5 rounded bg-rose-500/15 text-rose-400 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Disorganized webs quickly turn into illegible sticky-note clutter</span>
              </li>
              <li className="flex items-start gap-2 text-rose-300/80">
                <div className="p-0.5 rounded bg-rose-500/15 text-rose-400 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>No live voice speech attribution or automated extraction</span>
              </li>
              <li className="flex items-start gap-2 text-rose-300/80">
                <div className="p-0.5 rounded bg-rose-500/15 text-rose-400 mt-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </div>
                <span>Requires manual copy-pasting to export to Slack or databases</span>
              </li>
            </ul>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 text-center text-xs font-medium text-slate-400">
            Manual Labor Required
          </div>
        </div>
      </div>
    </section>
  );
}
