import { ArrowRight, Play, CheckCircle2, Mic, Target, CheckSquare, AlertTriangle } from "lucide-react";

export default function LandingHero({
  onLaunchNewWorkspace,
  onLaunchDemo,
}) {
  return (
    <section className="w-full max-w-5xl mx-auto text-center space-y-5 sm:space-y-6 md:space-y-7 pt-2 sm:pt-4 select-none">
      {/* Top Eyebrow Tag */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border-subtle text-xs text-text-muted shadow-subtle">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
        <span className="font-semibold tracking-wide text-[11px] sm:text-xs text-text-main">
          Real-Time Dialogue to Living Knowledge Graph
        </span>
      </div>

      {/* Main Headline */}
      <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.1] text-balance text-text-main">
        Meetings that{" "}
        <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
          map themselves.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-text-muted text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-normal text-balance px-4 font-normal">
        mindMesh listens to team dialogue in real time, automatically extracting goals, decisions,
        and action items onto an interactive 60fps living canvas. Never take manual notes again.
      </p>

      {/* Action CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-1 sm:pt-2">
        <button
          type="button"
          onClick={onLaunchNewWorkspace}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm sm:text-base shadow-md shadow-indigo-600/25 border border-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer group"
        >
          <span>Start Free Workspace</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={onLaunchDemo}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-surface hover:bg-surface-subtle text-text-main font-semibold text-sm sm:text-base border border-border-subtle hover:border-border-strong transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-subtle"
        >
          <Play className="w-4 h-4 text-indigo-600 fill-indigo-600" />
          <span>Explore Live Demo</span>
        </button>
      </div>

      {/* MAANG-Level Live Visual Preview Mockup */}
      <div className="pt-4 sm:pt-6">
        <div className="relative rounded-2xl sm:rounded-3xl border border-border-subtle bg-surface-subtle/80 p-4 sm:p-6 md:p-8 shadow-elevated text-left space-y-6">
          {/* Top Bar Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-semibold text-text-main">#sprint-planning</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-medium hidden xs:inline">
                Live Spatial Canvas
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
              <span className="text-emerald-600 font-semibold">● 60 FPS</span>
              <span>4 Collaborators</span>
            </div>
          </div>

          {/* Live Speaking Caption Pill */}
          <div className="p-3 sm:p-4 rounded-xl bg-surface border border-indigo-200/90 shadow-subtle flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm text-text-muted leading-relaxed">
              <span className="font-semibold text-text-main">Elena:</span>{" "}
              <span className="italic text-text-muted">
                "Marcus will lead the database redesign, but analytics must be ready first."
              </span>
            </div>
          </div>

          {/* Generated Semantic Cards Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
            {/* Goal Card */}
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

            {/* Task Card */}
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

            {/* Risk Card */}
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
    </section>
  );
}
