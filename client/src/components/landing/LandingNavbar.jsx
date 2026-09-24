import { ArrowRight, LogIn, LogOut, LayoutDashboard, Menu, X, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import BrandLogo from "../ui/BrandLogo.jsx";
import { getUserInitials, getUserColor } from "../../utils/colors.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useRouter } from "../../app.routes.jsx";
import { useTheme } from "../../hooks/useTheme.js";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
];

/**
 * LandingNavbar — self-contained via useAuth() and useRouter().
 */
export default function LandingNavbar() {
  const { user, logout } = useAuth();
  const { navigateToDashboard, navigateToLogin, navigateToRegister } = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const userInitials = user ? getUserInitials(user.name || "User") : "";
  const userColor = user ? getUserColor(user.name || "User") : "#A8542E";

  // Dynamic glassmorphic transparency on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("mindmesh_username");
        localStorage.removeItem("mindmesh_userid");
      }
      toast.info("Logged out successfully.");
    } catch {
      toast.error("Error logging out.");
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full h-16 transition-all duration-300 ease-in-out px-4 sm:px-6 lg:px-8 flex items-center justify-between select-none ${
          isScrolled
            ? "bg-surface/85 backdrop-blur-xl border-b border-border-subtle shadow-subtle"
            : "bg-app/40 backdrop-blur-md border-b border-transparent"
        }`}
      >
        {/* Brand Logo */}
        <a
          href="/"
          className="flex items-center gap-2.5 group transition-transform duration-200 active:scale-95 shrink-0"
          title="mindMesh Home"
        >
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-on-accent shadow-sm ring-1 ring-black/5 group-hover:bg-accent-hover transition-all duration-300">
            <BrandLogo className="w-4 h-4 text-on-accent" />
          </div>
          <span className="font-serif italic font-medium text-lg sm:text-xl tracking-tight text-text-main group-hover:text-accent transition-colors duration-300">
            mindMesh
          </span>
        </a>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-text-muted">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3.5 py-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons (Desktop) */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-muted hover:text-text-main bg-surface border border-border-subtle hover:border-border-strong transition-all duration-200 active:scale-90 cursor-pointer"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          {user ? (
            /* Authenticated State */
            <div className="flex items-center gap-3">
              {/* Dashboard Link */}
              <button
                type="button"
                onClick={() => navigateToDashboard()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-on-accent shadow-sm transition-all duration-200 active:scale-95 cursor-pointer group"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <div className="flex items-center gap-2 pl-3 border-l border-border-subtle">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0 transition-transform duration-200 hover:scale-105"
                  style={{ backgroundColor: userColor }}
                  title={`Signed in as ${user.name} (${user.email || "Member"})`}
                >
                  {userInitials}
                </div>
                <span className="text-xs font-semibold text-text-main max-w-[110px] truncate">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-rose-600 bg-surface/70 hover:bg-rose-500/10 border border-border-subtle hover:border-rose-500/30 transition-all duration-200 cursor-pointer active:scale-95 group shadow-2xs"
                  title="Log Out"
                  aria-label="Log out"
                >
                  <LogOut className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  <span className="hidden md:inline">Log out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Guest State */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToLogin()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-text-main hover:text-accent bg-surface/80 hover:bg-surface border border-border-subtle hover:border-border-strong hover:shadow-subtle transition-all duration-200 active:scale-95 cursor-pointer group"
              >
                <LogIn className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToRegister()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-on-accent shadow-sm transition-all duration-200 active:scale-95 cursor-pointer group"
              >
                <span>Start Free</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-muted hover:text-text-main bg-surface border border-border-subtle hover:border-border-strong transition-all duration-200 active:scale-90 cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-text-main bg-surface border border-border-subtle hover:border-border-strong transition-all duration-200 active:scale-90 cursor-pointer shadow-subtle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <div
              className={`transition-transform duration-300 ease-in-out ${
                isMobileMenuOpen ? "rotate-90 scale-110 text-text-main" : "rotate-0 scale-100"
              }`}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </div>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={`sm:hidden absolute top-16 left-0 right-0 bg-surface/98 border-b border-border-subtle p-4 space-y-3 backdrop-blur-2xl shadow-elevated transition-all duration-300 ease-in-out origin-top ${
            isMobileMenuOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-3 scale-98 pointer-events-none"
          }`}
        >
          <nav className="flex flex-col gap-1.5 text-sm font-medium text-text-muted">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-surface-subtle hover:text-text-main transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-border-subtle flex flex-col gap-2">
            {user ? (
              <>
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-subtle text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
                      style={{ backgroundColor: userColor }}
                    >
                      {userInitials}
                    </div>
                    <span className="text-text-main font-semibold">{user.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="text-rose-600 hover:underline cursor-pointer font-medium"
                  >
                    Log Out
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigateToDashboard();
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover text-on-accent shadow-sm transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Go to Dashboard
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigateToLogin();
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-text-main bg-surface-subtle hover:bg-surface-hover border border-border-subtle transition-all active:scale-[0.99] cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigateToRegister();
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover text-on-accent shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                >
                  Start Free Workspace
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`sm:hidden fixed inset-0 top-16 bg-text-main/15 backdrop-blur-xs z-40 transition-opacity duration-300 ease-in-out ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />
    </>
  );
}
