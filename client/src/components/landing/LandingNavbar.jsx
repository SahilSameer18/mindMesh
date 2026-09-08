import { ArrowRight, LogIn, LogOut, Layers, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import BrandLogo from "../ui/BrandLogo.jsx";
import { getUserInitials, getUserColor } from "../../utils/colors.js";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#workspaces", label: "Workspaces" },
  { href: "#compare", label: "Compare" },
  { href: "#faq", label: "FAQ" },
];

export default function LandingNavbar({
  user,
  onOpenAuth,
  onLaunchDemo,
  onLaunchNewWorkspace,
  onLogout,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const userInitials = user ? getUserInitials(user.name || "User") : "";
  const userColor = user ? getUserColor(user.name || "User") : "#6366f1";

  // Dynamic glassmorphic transparency on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full h-16 transition-all duration-300 ease-in-out px-4 sm:px-6 lg:px-8 flex items-center justify-between select-none ${
          isScrolled
            ? "bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/25"
            : "bg-slate-950/20 backdrop-blur-md border-b border-white/[0.05]"
        }`}
      >
        {/* Brand Logo */}
        <a
          href="/"
          className="flex items-center gap-2.5 group transition-transform duration-200 active:scale-95 shrink-0"
          title="mindMesh Home"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 group-hover:scale-105 group-hover:shadow-indigo-500/40 transition-all duration-300">
            <BrandLogo className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent group-hover:from-white group-hover:via-indigo-200 group-hover:to-white transition-all duration-300">
            mindMesh
          </span>
        </a>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-400">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons (Desktop) */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            /* Authenticated State */
            <div className="flex items-center gap-3">
              <a
                href="#workspaces"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-indigo-300 hover:bg-slate-800/40 transition-all duration-200"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>My Workspaces</span>
              </a>

              <div className="flex items-center gap-2 pl-3 border-l border-slate-800/80">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-950 shadow-sm shrink-0 transition-transform duration-200 hover:scale-105"
                  style={{ backgroundColor: userColor }}
                  title={`Signed in as ${user.name} (${user.email || "Member"})`}
                >
                  {userInitials}
                </div>
                <span className="text-xs font-semibold text-slate-200 max-w-[110px] truncate">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 cursor-pointer active:scale-90"
                  title="Log Out"
                  aria-label="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Guest State */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth?.("login")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={onLaunchNewWorkspace}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 border border-white/15 transition-all duration-200 hover:shadow-indigo-600/40 active:scale-95 cursor-pointer group"
              >
                <span>Start Free</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Action & Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={onLaunchNewWorkspace}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95"
          >
            Start
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all duration-200 active:scale-90 cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <div
              className={`transition-transform duration-300 ease-in-out ${
                isMobileMenuOpen ? "rotate-90 scale-110 text-white" : "rotate-0 scale-100"
              }`}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </div>
          </button>
        </div>

        {/* Mobile Menu Dropdown (Smooth Slide & Fade) */}
        <div
          className={`sm:hidden absolute top-16 left-0 right-0 bg-slate-950/95 border-b border-slate-800 p-4 space-y-3 backdrop-blur-2xl shadow-2xl transition-all duration-300 ease-in-out origin-top ${
            isMobileMenuOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-3 scale-98 pointer-events-none"
          }`}
        >
          <nav className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-900 hover:text-white transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            {user ? (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/60 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-slate-950 shadow-sm shrink-0"
                    style={{ backgroundColor: userColor }}
                  >
                    {userInitials}
                  </div>
                  <span className="text-slate-200 font-semibold">{user.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="text-rose-400 hover:underline cursor-pointer font-medium"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth?.("login");
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all active:scale-[0.99] cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLaunchNewWorkspace();
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 transition-all active:scale-[0.99] cursor-pointer"
                >
                  Start Free Workspace
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay (Smooth Fade) */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`sm:hidden fixed inset-0 top-16 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />
    </>
  );
}
