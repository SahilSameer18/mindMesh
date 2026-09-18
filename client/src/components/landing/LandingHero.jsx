import { ArrowRight, Play, Mic, Target, CheckSquare, AlertTriangle } from "lucide-react";

export default function LandingHero({
  onLaunchNewWorkspace,
  onLaunchDemo,
}) {
  return (
    <section className="w-full max-w-6xl mx-auto pt-2 sm:pt-4 select-none">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left: Entry heading */}
        <div className="lg:col-span-5 text-left space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-text-faint uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            <span>Entry No. 001 — Live Session</span>
          </div>

          <h1 className="font-serif italic font-medium text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.08] text-text-main text-balance">
            Say it once.
            <br />
            Watch it get filed.
          </h1>

          <p className="text-text-muted text-sm sm:text-base max-w-md leading-relaxed">
            mindMesh listens to the room and files every goal, decision, and risk onto a
            living canvas as you speak — no notetaker, no recap meeting, no manual cleanup.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            <button
              type="button"
              onClick={onLaunchNewWorkspace}
              className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer group"
            >
              <span>Start Free Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onLaunchDemo}
              className="flex items-center gap-2 text-sm font-semibold text-text-main hover:text-accent transition-colors cursor-pointer group"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="border-b border-text-main/30 group-hover:border-accent">Watch it work</span>
            </button>
          </div>
        </div>

        {/* Right: Live demo panel — the product showing itself, not describing itself */}
        <div className="lg:col-span-7">
          <div className="relative rounded-2xl border border-border-subtle bg-surface-subtle/80 p-4 sm:p-6 shadow-elevated text-left space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle text-xs text-text-muted">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono font-semibold text-text-main">#sprint-planning</span>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 text-[10px] font-medium hidden xs:inline">
                  Live Spatial Canvas
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                <span className="text-emerald-600 font-semibold">● 60 FPS</span>
                <span>4 Collaborators</span>
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-surface border border-accent/25 shadow-subtle flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm text-text-muted leading-relaxed">
                <span className="font-semibold text-text-main">Elena:</span>{" "}
                <span className="italic text-text-muted">
                  "Marcus will lead the database redesign, but analytics must be ready first."
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-surface border border-amber-200/90 space-y-2 shadow-subtle">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold text-[10px] flex items-center gap-1">
                    <Target className="w-3 h-3 text-amber-600" /> Goal
                  </span>
                  <span className="text-[10px] font-mono text-text-faint">Milestone</span>
                </div>
                <p className="text-xs font-semibold text-text-main">
                  Improve developer onboarding workflow
                </p>
                <div className="text-[10px] text-text-faint pt-1 border-t border-border-subtle">
                  Attributed: Elena · 10:14 AM
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-emerald-200/90 space-y-2 shadow-subtle">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold text-[10px] flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-emerald-600" /> Task
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold">Marcus</span>
                </div>
                <p className="text-xs font-semibold text-text-main">
                  Redesign database indexing
                </p>
                <div className="text-[10px] text-text-faint pt-1 border-t border-border-subtle flex justify-between">
                  <span>In Progress</span>
                  <span className="text-emerald-600 font-medium">High Priority</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-rose-200/90 space-y-2 shadow-subtle">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold text-[10px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Risk
                  </span>
                  <span className="text-[10px] font-mono text-rose-700 font-semibold">Blocker</span>
                </div>
                <p className="text-xs font-semibold text-text-main">
                  Analytics dashboard readiness dependency
                </p>
                <div className="text-[10px] text-text-faint pt-1 border-t border-border-subtle">
                  Blocks: Release 2.0
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
