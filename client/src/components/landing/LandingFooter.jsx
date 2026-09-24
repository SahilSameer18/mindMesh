import { ArrowRight } from "lucide-react";
import BrandLogo from "../ui/BrandLogo.jsx";
import { useRouter } from "../../app.routes.jsx";

export default function LandingFooter({ onLaunchNewWorkspace }) {
  const { navigateToLogin, navigateToRegister } = useRouter();

  return (
    <footer className="w-full border-t border-border-subtle bg-app pt-16 sm:pt-20 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-3xl mx-auto space-y-16">
        {/* Closing entry — a real CTA, not just a sign-off */}
        <div className="relative rounded-2xl border border-border-subtle bg-surface p-8 sm:p-10 shadow-elevated overflow-hidden text-center sm:text-left">
          <div className="absolute -bottom-16 -right-10 w-48 h-48 bg-accent/[0.06] rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-widest text-text-faint">
                Entry No. 002 — Closing
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif italic font-medium text-text-main tracking-tight">
                Your next meeting could file itself.
              </h2>
            </div>
            <button
              type="button"
              onClick={onLaunchNewWorkspace}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-sm shadow-sm transition-all active:scale-95 cursor-pointer group"
            >
              <span>Start Free Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-on-accent shadow-sm">
                <BrandLogo className="w-3.5 h-3.5 text-on-accent" />
              </div>
              <span className="font-serif italic font-medium text-lg text-text-main tracking-tight">
                mindMesh
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-xs">
              The living workspace where dialogue turns into a structured knowledge graph in real time.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <h4 className="font-semibold text-text-main tracking-wide uppercase text-[11px]">Explore</h4>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a href="#how-it-works" className="hover:text-accent transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#compare" className="hover:text-accent transition-colors">
                  Compare
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-accent transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3 text-xs">
            <h4 className="font-semibold text-text-main tracking-wide uppercase text-[11px]">Account</h4>
            <ul className="space-y-2 text-text-muted">
              <li>
                <button
                  type="button"
                  onClick={() => navigateToLogin()}
                  className="hover:text-accent transition-colors cursor-pointer text-left"
                >
                  Sign In
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateToRegister()}
                  className="hover:text-accent transition-colors cursor-pointer text-left"
                >
                  Create Account
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted text-center sm:text-left">
          <p>© {new Date().getFullYear()} mindMesh. All rights reserved.</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-faint">
            End of entry
          </p>
        </div>
      </div>
    </footer>
  );
}
