import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { AlertTriangle, Trash2, X, ArrowRight, Dices, Zap, Brain } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useRouter } from "../app.routes.jsx";
import AuthModal from "../components/auth/AuthModal.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import { getUserInitials, getUserColor } from "../utils/colors.js";

// Modular Landing Page Components
import LandingNavbar from "../components/landing/LandingNavbar.jsx";
import LandingHero from "../components/landing/LandingHero.jsx";
import LandingHowItWorks from "../components/landing/LandingHowItWorks.jsx";
import LandingWorkspaces from "../components/landing/LandingWorkspaces.jsx";
import LandingComparison from "../components/landing/LandingComparison.jsx";
import LandingFAQ from "../components/landing/LandingFAQ.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";

const COOL_ROOM_SLUGS = [
  "aurora-sprint",
  "quantum-design",
  "matrix-sync",
  "nexus-architecture",
  "prism-roadmap",
  "hyper-brainstorm",
  "pulse-retro",
  "orbit-ops",
  "vortex-strategy",
  "zenith-sprint",
];

export default function LandingPage() {
  const { user, logout } = useAuth();
  const { navigateToRoom } = useRouter();

  // User Display Name State
  const [userName, setUserName] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("mindmesh_username") || user?.name || "";
    }
    return user?.name || "";
  });

  useEffect(() => {
    if (user?.name && !userName) {
      setUserName(user.name);
    }
  }, [user, userName]);

  // Workspace Creator Modal State
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [roomName, setRoomName] = useState(() => {
    const randomIndex = Math.floor(Math.random() * COOL_ROOM_SLUGS.length);
    return COOL_ROOM_SLUGS[randomIndex];
  });
  const [roomMode, setRoomMode] = useState("operational");
  const [isRolling, setIsRolling] = useState(false);

  // Recent Rooms State & Deletion State
  const [recentRooms, setRecentRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");

  // Fetch active rooms from backend API
  useEffect(() => {
    let isMounted = true;
    async function fetchRooms() {
      try {
        const apiBase =
          import.meta.env.VITE_SERVER_URL ||
          (typeof window !== "undefined" && window.location.port === "5173"
            ? `${window.location.protocol}//${window.location.hostname}:3000`
            : "");

        const res = await fetch(`${apiBase}/api/rooms`, { credentials: "include" });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && isMounted) {
            setRecentRooms(json.data);
          }
        }
      } catch (err) {
        console.warn("[LandingPage] Could not fetch rooms list:", err);
      } finally {
        if (isMounted) setIsLoadingRooms(false);
      }
    }
    fetchRooms();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setRoomToDelete(null);
        setIsLaunchModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Roll new cool room slug
  const rollRoomSlug = () => {
    setIsRolling(true);
    setTimeout(() => {
      const filtered = COOL_ROOM_SLUGS.filter((s) => s !== roomName);
      const nextSlug = filtered[Math.floor(Math.random() * filtered.length)];
      setRoomName(nextSlug);
      setIsRolling(false);
    }, 180);
  };

  // Launch Workspace Handler
  const handleExecuteLaunch = (e) => {
    e?.preventDefault();
    const finalRoomId =
      roomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-") || "workspace-1";
    if (userName.trim() && typeof localStorage !== "undefined") {
      localStorage.setItem("mindmesh_username", userName.trim());
    }
    setIsLaunchModalOpen(false);
    toast.info(`Entering workspace #${finalRoomId}...`);
    navigateToRoom(finalRoomId);
  };

  // Launch Demo Room Handler
  const handleLaunchDemo = () => {
    if (!userName.trim() && typeof localStorage !== "undefined") {
      localStorage.setItem("mindmesh_username", user?.name || "Explorer");
    }
    toast.info("Entering demo room...");
    navigateToRoom("demo-room");
  };

  // Open Auth Modal
  const handleOpenAuth = (tab = "login") => {
    setAuthTab(tab);
    setIsAuthModalOpen(true);
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logout();
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("mindmesh_username");
        localStorage.removeItem("mindmesh_userid");
      }
      setUserName("");
      toast.info("Logged out successfully.");
    } catch {
      toast.error("Error logging out.");
    }
  };

  // Workspace Deletion Handler
  const handleDeleteClick = (e, room) => {
    e.stopPropagation();
    setRoomToDelete(room);
  };

  const handleExecuteDeleteRoom = async () => {
    if (!roomToDelete) return;
    setIsDeletingRoom(true);
    const targetRoomId = roomToDelete.id;
    try {
      const apiBase =
        import.meta.env.VITE_SERVER_URL ||
        (typeof window !== "undefined" && window.location.port === "5173"
          ? `${window.location.protocol}//${window.location.hostname}:3000`
          : "");

      const res = await fetch(`${apiBase}/api/rooms/${encodeURIComponent(targetRoomId)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setRecentRooms((prev) => prev.filter((r) => r.id !== targetRoomId));
        toast.success(`Workspace "${roomToDelete.name || targetRoomId}" permanently deleted.`);
        setRoomToDelete(null);
      } else {
        toast.error("Failed to delete workspace from server.");
      }
    } catch (err) {
      console.error("[LandingPage] Could not delete room:", err);
      toast.error("Network error while deleting workspace.");
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const userInitials = getUserInitials(userName || "Guest");
  const userColor = getUserColor(userName || "Guest");

  return (
    <div className="min-h-screen w-full bg-app text-text-main flex flex-col selection:bg-indigo-500/15 selection:text-indigo-900 overflow-x-hidden font-sans relative">
      {/* Ambient Background Gradient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-200/40 via-violet-100/30 to-sky-100/40 blur-[130px] rounded-full" />
        <div className="absolute top-[35%] -left-32 w-[500px] h-[400px] bg-purple-100/30 blur-[140px] rounded-full" />
        <div className="absolute top-[65%] -right-32 w-[550px] h-[450px] bg-sky-100/30 blur-[140px] rounded-full" />
      </div>

      {/* 1. Navbar */}
      <LandingNavbar
        user={user}
        onOpenAuth={handleOpenAuth}
        onLaunchDemo={handleLaunchDemo}
        onLaunchNewWorkspace={() => setIsLaunchModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Flow */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 sm:pb-16 md:pb-20 space-y-16 sm:space-y-24 z-10">
        {/* 2. Category-Defining Hero */}
        <LandingHero
          onLaunchNewWorkspace={() => setIsLaunchModalOpen(true)}
          onLaunchDemo={handleLaunchDemo}
        />

        {/* 3. Workflow Bridge */}
        <LandingHowItWorks />

        {/* 4. Dynamic Workspaces Section */}
        <LandingWorkspaces
          user={user}
          rooms={recentRooms}
          isLoading={isLoadingRooms}
          onNavigateToRoom={navigateToRoom}
          onDeleteClick={handleDeleteClick}
          onOpenAuth={handleOpenAuth}
          onLaunchDemo={handleLaunchDemo}
        />

        {/* 5. Modern Comparison */}
        <LandingComparison />

        {/* 6. Split Editorial FAQ (All closed by default) */}
        <LandingFAQ />
      </main>

      {/* 7. Enterprise SaaS Footer */}
      <LandingFooter
        onOpenAuth={handleOpenAuth}
        onLaunchDemo={handleLaunchDemo}
      />

      {/* Focused Launch Workspace Modal (Clean & uncluttered) */}
      {isLaunchModalOpen && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] bg-text-main/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsLaunchModalOpen(false)}
        >
          <div
            className="bg-surface border border-border-subtle rounded-2xl sm:rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-elevated space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLaunchModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <BrandLogo className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-text-main tracking-tight">
                  Launch a Workspace
                </h3>
              </div>
              <p className="text-xs text-text-muted">
                Choose a room name and meeting mode for your team canvas.
              </p>
            </div>

            <form onSubmit={handleExecuteLaunch} className="space-y-4 pt-1">
              {/* 1. Name */}
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1.5">
                  Your Display Name
                </label>
                <div className="relative flex items-center">
                  <div
                    className="absolute left-3 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
                    style={{ backgroundColor: userColor }}
                  >
                    {userInitials}
                  </div>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                      if (typeof localStorage !== "undefined") {
                        localStorage.setItem("mindmesh_username", e.target.value.trim());
                      }
                    }}
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-sm text-text-main placeholder:text-text-faint focus:outline-none focus:border-indigo-500 font-medium"
                    autoFocus
                  />
                </div>
              </div>

              {/* 2. Room Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-text-main">
                    Room Name
                  </label>
                  <button
                    type="button"
                    onClick={rollRoomSlug}
                    className="flex items-center gap-1 text-[11px] text-text-muted hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <Dices className={`w-3.5 h-3.5 ${isRolling ? "animate-spin" : ""}`} />
                    <span>Randomize</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-text-faint font-mono select-none">#</span>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="sprint-planning"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-sm text-text-main placeholder:text-text-faint focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* 3. Meeting Mode */}
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1.5">
                  Meeting Mode
                </label>
                <div className="relative grid grid-cols-2 p-1 rounded-xl bg-surface-subtle border border-border-subtle select-none">
                  {/* Sliding Indicator */}
                  <div
                    className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-surface shadow-subtle border border-border-subtle transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none will-change-transform ${
                      roomMode === "brainstorm" ? "translate-x-full" : "translate-x-0"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setRoomMode("operational")}
                    className={`relative z-10 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                      roomMode === "operational"
                        ? "text-text-main"
                        : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 transition-all duration-300 ${roomMode === "operational" ? "text-sky-500 fill-sky-500/20 scale-110" : "text-text-muted/60 scale-100"}`} />
                    <span>Operational</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomMode("brainstorm")}
                    className={`relative z-10 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                      roomMode === "brainstorm"
                        ? "text-text-main"
                        : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    <Brain className={`w-3.5 h-3.5 transition-all duration-300 ${roomMode === "brainstorm" ? "text-purple-500 fill-purple-500/20 scale-110" : "text-text-muted/60 scale-100"}`} />
                    <span>Brainstorm</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authTab}
      />

      {/* In-App Workspace Deletion Confirmation Modal */}
      {roomToDelete && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] bg-text-main/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingRoom && setRoomToDelete(null)}
        >
          <div
            className="bg-surface border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-elevated space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !isDeletingRoom && setRoomToDelete(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-xs animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 pt-0.5">
                <h3 className="text-base font-bold text-text-main tracking-tight">
                  Delete Workspace Permanently?
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Permanently delete workspace{" "}
                  <span className="font-mono text-text-main font-semibold">
                    #{roomToDelete.name || roomToDelete.id}
                  </span>
                  ? All cards, relationships, audio transcripts, and meeting summaries will be wiped from the database.
                </p>
                <p className="text-[11px] text-rose-600 font-medium pt-1">
                  ⚠️ This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border-subtle gap-2.5">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                disabled={isDeletingRoom}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-main bg-surface-subtle hover:bg-surface-hover border border-border-subtle transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteRoom}
                disabled={isDeletingRoom}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingRoom ? "Deleting Workspace..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
