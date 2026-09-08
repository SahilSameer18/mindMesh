import { ArrowRight, Play, CheckCircle2, Mic, Target, CheckSquare, AlertTriangle } from "lucide-react";

export default function LandingHero({
  onLaunchNewWorkspace,
  onLaunchDemo,
}) {
  return (
    <section className="w-full max-w-5xl mx-auto text-center space-y-8 sm:space-y-10 pt-4 sm:pt-10 select-none">
      {/* Top Eyebrow Tag */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-md backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
        <span className="font-semibold tracking-wide text-[11px] sm:text-xs">
          Real-Time Dialogue to Living Knowledge Graph
        </span>
      </div>

      {/* Main Headline */}
      <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[1.08] text-balance">
        Meetings that{" "}
        <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
          map themselves.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-sm sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-balance px-4">
        mindMesh listens to team dialogue in real time, automatically extracting goals, decisions,
        and action items onto an interactive 60fps living canvas. Never take manual notes again.
      </p>

      {/* Action CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
        <button
          type="button"
          onClick={onLaunchNewWorkspace}
          className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-indigo-600/30 border border-white/20 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer group"
        >
          <span>Start Free Workspace</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={onLaunchDemo}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm sm:text-base border border-slate-800 hover:border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <Play className="w-4 h-4 text-sky-400 fill-sky-400" />
          <span>Explore Live Demo</span>
        </button>
      </div>

      {/* MAANG-Level Live Visual Preview Mockup */}
      <div className="pt-4 sm:pt-6">
        <div className="relative rounded-2xl sm:rounded-3xl border border-slate-800/90 bg-slate-900/80 p-4 sm:p-6 md:p-8 backdrop-blur-2xl shadow-2xl overflow-hidden text-left space-y-6">
          {/* Top Bar Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/70 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-semibold text-slate-200">#sprint-planning</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-[10px] font-medium hidden xs:inline">
                Live Spatial Canvas
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="text-emerald-400">● 60 FPS</span>
              <span>4 Collaborators</span>
            </div>
          </div>

          {/* Live Speaking Caption Pill */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 shadow-lg flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">Elena:</span>{" "}
              <span className="italic text-slate-300">
                "Marcus will lead the database redesign, but analytics must be ready first."
              </span>
            </div>
          </div>

          {/* Generated Semantic Cards Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
            {/* Goal Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold text-[10px] flex items-center gap-1">
                  <Target className="w-3 h-3" /> Goal
                </span>
                <span className="text-[10px] font-mono text-slate-500">Milestone</span>
              </div>
              <p className="text-xs font-semibold text-slate-100">
                Improve developer onboarding workflow
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                Attributed: Elena · 10:14 AM
              </div>
            </div>

            {/* Task Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold text-[10px] flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" /> Task
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">Marcus</span>
              </div>
              <p className="text-xs font-semibold text-slate-100">
                Redesign database indexing
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 flex justify-between">
                <span>In Progress</span>
                <span className="text-emerald-400">High Priority</span>
              </div>
            </div>

            {/* Risk Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/40 space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-semibold text-[10px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Risk
                </span>
                <span className="text-[10px] font-mono text-rose-400 font-semibold">Blocker</span>
              </div>
              <p className="text-xs font-semibold text-slate-100">
                Analytics dashboard readiness dependency
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                Blocks: Release 2.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
