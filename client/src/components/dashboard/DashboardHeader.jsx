import { LogOut } from "lucide-react";
import { toast } from "sonner";
import BrandLogo from "../ui/BrandLogo.jsx";
import { getUserInitials, getUserColor } from "../../utils/colors.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useRouter } from "../../app.routes.jsx";

/**
 * Minimal app-shell header for authenticated surfaces (Dashboard).
 * Deliberately not LandingNavbar — no marketing nav links or CTAs here;
 * this page's job is getting back to work, not persuading a visitor.
 */
export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const { navigateToHome } = useRouter();

  const userInitials = user ? getUserInitials(user.name || "User") : "";
  const userColor = user ? getUserColor(user.name || "User") : "#A8542E";

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
    <header className="h-16 border-b border-border-subtle bg-surface/90 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 select-none shadow-subtle">
      <button
        type="button"
        onClick={() => navigateToHome()}
        className="flex items-center gap-2.5 group cursor-pointer"
        title="mindMesh Home"
      >
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-on-accent shadow-sm group-hover:bg-accent-hover transition-colors">
          <BrandLogo className="w-4 h-4 text-on-accent" />
        </div>
        <span className="font-serif italic font-medium text-lg tracking-tight text-text-main">
          mindMesh
        </span>
      </button>

      {user && (
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
            style={{ backgroundColor: userColor }}
            title={`Signed in as ${user.name} (${user.email || "Member"})`}
          >
            {userInitials}
          </div>
          <span className="text-xs font-semibold text-text-main max-w-[140px] truncate hidden sm:inline">
            {user.name}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            title="Log Out"
            aria-label="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}
