import { useLocation } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  Sparkles,
  Target,
  CheckSquare,
  Compass,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "../app.routes.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";

export default function NotFoundPage() {
  const { navigateToHome, navigateToDashboard, navigateToRoom } = useRouter();
  const location = useLocation();

  const currentPath = location.pathname || "/unknown-space";

  return (
    <div className="min-h-screen w-full flex flex-col bg-app text-text-main relative overflow-hidden font-sans selection:bg-indigo-500/15 selection:text-indigo-900">
      {/* 1. Ambient Background Glowing Mesh (Signature mindMesh atmospheric lighting) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] bg-gradient-to-tr from-indigo-200/50 via-violet-100/40 to-sky-100/45 blur-[140px] rounded-full" />
        <div className="absolute top-[35%] -left-36 w-[520px] h-[420px] bg-purple-100/35 blur-[145px] rounded-full" />
        <div className="absolute bottom-10 right-[-10%] w-[580px] h-[460px] bg-sky-100/35 blur-[150px] rounded-full" />
        {/* Subtle Canvas Dot Grid */}
        <div className="absolute inset-0 canvas-grid [background-size:28px_28px] opacity-25 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_85%)]" />
      </div>

      {/* 2. Top Minimalist Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <button
          onClick={() => navigateToHome()}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <BrandLogo size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-text-main">
            mind<span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Mesh</span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/80 backdrop-blur-md border border-border-subtle text-xs text-text-muted shadow-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-mono text-[11px] font-medium text-text-muted">
              STATUS: UNMAPPED ROUTE
            </span>
          </div>

          <button
            onClick={() => navigateToHome()}
            className="text-xs font-semibold text-text-muted hover:text-text-main px-3.5 py-1.5 rounded-xl bg-surface/60 hover:bg-surface border border-border-subtle transition-all cursor-pointer shadow-subtle"
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* 3. Main Stage */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center py-6 sm:py-10">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface/90 backdrop-blur-md border border-indigo-200/80 shadow-subtle text-xs font-medium text-indigo-700 mb-4 animate-fade-in">
          <Compass className="w-3.5 h-3.5 text-indigo-600 animate-spin [animation-duration:12s]" />
          <span className="font-semibold tracking-wide">Coordinate 404 // Out of Range</span>
        </div>

        {/* Hero Title with Gradient Accent */}
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight text-text-main leading-[1.1] max-w-3xl mb-4">
          This canvas drifted into{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            uncharted space.
          </span>
        </h1>

        {/* Subtitle with dynamic path feedback */}
        <p className="text-text-muted text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
          The node or workspace at{" "}
          <code className="px-2 py-0.5 rounded-md bg-surface border border-border-subtle font-mono text-xs sm:text-sm text-indigo-600 font-semibold shadow-subtle">
            {currentPath}
          </code>{" "}
          doesn’t exist in this mesh, the room was archived, or the link has a typo.
        </p>

        {/* 4. Centerpiece: Living Spatial Graph Mockup (The Signature WOW Element) */}
        <div className="w-full max-w-3xl relative rounded-2xl sm:rounded-3xl border border-border-subtle bg-surface/80 backdrop-blur-xl p-4 sm:p-6 shadow-elevated text-left mb-8 overflow-hidden group">
          {/* Subtle canvas grid backdrop inside container */}
          <div className="absolute inset-0 canvas-grid [background-size:22px_22px] opacity-30 pointer-events-none" />

          {/* Top Canvas Telemetry Bar */}
          <div className="relative z-10 flex items-center justify-between pb-3 mb-4 border-b border-border-subtle text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-mono font-semibold text-text-main">
                #spatial-mesh:sector-404
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold hidden xs:inline">
                Disconnected Node
              </span>
            </div>
            <div className="flex items-center gap-2.5 font-mono text-[11px] text-text-muted">
              <span>X: -404.00</span>
              <span>Y: +404.00</span>
              <span className="text-indigo-600 font-semibold hidden sm:inline">● Zoom 100%</span>
            </div>
          </div>

          {/* Connected Curved SVG Thread */}
          <div className="relative">
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none hidden md:block z-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="meshThreadGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              <path
                d="M 120 45 Q 260 10, 390 45 T 660 45"
                fill="none"
                stroke="url(#meshThreadGradient)"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            </svg>

            {/* Floating Spatial Cards Deck */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative z-10">
              {/* Card 1: Missing Route Goal */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-surface border border-amber-200/90 shadow-subtle space-y-2 hover:-translate-y-0.5 hover:shadow-card transition-all">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold text-[10px] flex items-center gap-1">
                    <Target className="w-3 h-3 text-amber-600" /> Goal
                  </span>
                  <span className="text-[10px] font-mono text-amber-600 font-semibold">Unresolved</span>
                </div>
                <p className="text-xs font-semibold text-text-main">
                  Locate target canvas coordinates
                </p>
                <div className="text-[10px] text-text-faint pt-1 border-t border-border-subtle flex justify-between">
                  <span>Target: {currentPath.length > 18 ? currentPath.slice(0, 18) + "..." : currentPath}</span>
                  <span className="text-rose-500 font-medium">Missing</span>
                </div>
              </div>

              {/* Card 2: Consensus Decision */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-surface border border-indigo-200/90 shadow-subtle space-y-2 hover:-translate-y-0.5 hover:shadow-card transition-all">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold text-[10px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" /> Decision
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 font-semibold">Consensus</span>
                </div>
                <p className="text-xs font-semibold text-text-main">
                  Reroute session back to active space
                </p>
                <div className="text-[10px] text-text-faint pt-1 border-t border-border-subtle flex justify-between">
                  <span>Status: Ready</span>
                  <span className="text-indigo-600 font-medium">Recommended</span>
                </div>
              </div>

              {/* Card 3: Action Item Task */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-surface border border-emerald-200/90 shadow-subtle space-y-2 hover:-translate-y-0.5 hover:shadow-card transition-all">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold text-[10px] flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-emerald-600" /> Action Item
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold">Priority 1</span>
                </div>
                <p className="text-xs font-semibold text-text-main">
                  Pick a workspace or launch fresh demo
                </p>
                <div className="text-[10px] text-text-faint pt-1 border-t border-border-subtle flex justify-between">
                  <span>Assigned: Explorer</span>
                  <span className="text-emerald-600 font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigateToHome()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm sm:text-base shadow-md shadow-indigo-600/25 border border-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Return to Studio</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToDashboard()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-surface hover:bg-surface-subtle text-text-main font-semibold text-sm sm:text-base border border-border-subtle hover:border-border-strong transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-subtle group"
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>All Workspaces</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToRoom("demo-room")}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-surface/70 hover:bg-surface text-text-muted hover:text-text-main font-semibold text-sm sm:text-base border border-border-subtle hover:border-border-strong transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-subtle group"
          >
            <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
            <span>Open Demo Canvas</span>
          </button>
        </div>

        {/* 6. Quick Path Discovery Suggestions */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-text-muted">
          <span>Quick destinations:</span>
          <button
            onClick={() => navigateToHome()}
            className="hover:text-indigo-600 underline underline-offset-4 cursor-pointer"
          >
            Home
          </button>
          <span className="text-text-faint">·</span>
          <button
            onClick={() => navigateToDashboard()}
            className="hover:text-indigo-600 underline underline-offset-4 cursor-pointer"
          >
            Workspaces
          </button>
          <span className="text-text-faint">·</span>
          <button
            onClick={() => navigateToRoom("demo-room")}
            className="hover:text-indigo-600 underline underline-offset-4 cursor-pointer inline-flex items-center gap-1"
          >
            Demo Room <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </main>

      {/* 7. Bottom Elegant Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted border-t border-border-subtle/60 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-main">mindMesh</span>
          <span>— Collaborative Spatial Workspace</span>
        </div>
        <div className="text-text-faint font-mono text-[11px]">
          HTTP 404 · Resource Not Found
        </div>
      </footer>
    </div>
  );
}
