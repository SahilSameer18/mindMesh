import { useLocation } from "react-router-dom";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useRouter } from "../app.routes.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";

export default function NotFoundPage() {
  const { navigateToHome, navigateToDashboard } = useRouter();
  const location = useLocation();

  const currentPath = location.pathname || "/unknown-space";

  return (
    <div className="min-h-screen w-full flex flex-col bg-app text-text-main relative overflow-hidden font-sans selection:bg-accent/20 selection:text-accent">
      {/* Ambient glow, matching every other page — warm, not a rainbow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-accent/[0.07] blur-[130px] rounded-full" />
        <div className="absolute inset-0 canvas-grid [background-size:28px_28px] opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_85%)]" />
      </div>

      {/* Minimal header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <button
          onClick={() => navigateToHome()}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-sm group-hover:bg-accent-hover group-hover:scale-105 transition-all">
            <BrandLogo size={18} className="text-on-accent" />
          </div>
          <span className="font-serif italic font-medium text-xl tracking-tight text-text-main">
            mindMesh
          </span>
        </button>

        <button
          onClick={() => navigateToHome()}
          className="text-xs font-semibold text-text-main bg-surface border border-border-subtle hover:border-border-strong hover:bg-surface-subtle px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-subtle"
        >
          Back to home
        </button>
      </header>

      {/* Main Stage — one clear message, one obvious way forward */}
      <main className="relative z-10 flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center py-10">
        <div className="flex items-center gap-2 text-xs font-mono text-text-faint uppercase tracking-widest mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
          <span>No Entry Found</span>
        </div>

        <h1 className="font-serif italic font-medium text-4xl sm:text-5xl tracking-tight text-text-main leading-[1.15] mb-4">
          This page isn't in the ledger.
        </h1>

        <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-2">
          Nothing lives at
        </p>
        <code className="px-3 py-1 rounded-md bg-surface border border-border-subtle font-mono text-xs sm:text-sm text-accent font-semibold shadow-subtle mb-8 max-w-full truncate">
          {currentPath}
        </code>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigateToHome()}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToDashboard()}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-surface hover:bg-surface-subtle text-text-main font-semibold text-sm border border-border-subtle hover:border-border-strong transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-subtle"
          >
            <LayoutDashboard className="w-4 h-4 text-accent" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </main>

      {/* Simple footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted border-t border-border-subtle/60 gap-2">
        <span>© {new Date().getFullYear()} mindMesh. All rights reserved.</span>
        <span className="text-text-faint font-mono text-[11px]">HTTP 404</span>
      </footer>
    </div>
  );
}
