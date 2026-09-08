import BrandLogo from "../ui/BrandLogo.jsx";

export default function LandingFooter({ onOpenAuth, onLaunchDemo }) {
  return (
    <footer className="w-full border-t border-border-subtle bg-surface-subtle pt-12 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Top 4-Column SaaS Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Column (Span 2 on desktop) */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <BrandLogo className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-text-main tracking-tight">
                mindMesh
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm">
              The living collaborative workspace where team dialogue turns into structured knowledge graphs in real time.
            </p>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold text-text-main tracking-wide uppercase text-[11px]">Product</h4>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a href="#how-it-works" className="hover:text-text-main transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#compare" className="hover:text-text-main transition-colors">
                  Compare
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onLaunchDemo}
                  className="hover:text-text-main transition-colors cursor-pointer text-left"
                >
                  Interactive Demo
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold text-text-main tracking-wide uppercase text-[11px]">Solutions</h4>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a href="#workspaces" className="hover:text-text-main transition-colors">
                  Sprint Planning
                </a>
              </li>
              <li>
                <a href="#workspaces" className="hover:text-text-main transition-colors">
                  Brainstorming
                </a>
              </li>
              <li>
                <a href="#workspaces" className="hover:text-text-main transition-colors">
                  Architecture Sync
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Security & Company */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold text-text-main tracking-wide uppercase text-[11px]">Trust & Legal</h4>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a href="#faq" className="hover:text-text-main transition-colors">
                  Audio Privacy
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-text-main transition-colors">
                  Data Protection
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth?.("login")}
                  className="hover:text-text-main transition-colors cursor-pointer text-left"
                >
                  Account Portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Line Copyright */}
        <div className="pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted text-center sm:text-left">
          <p>© {new Date().getFullYear()} mindMesh Technologies Inc. All rights reserved.</p>
          <p className="font-medium text-text-main/80">Empowering high-velocity product teams worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
