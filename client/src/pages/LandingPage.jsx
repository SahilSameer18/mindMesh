import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext.jsx";
import { useRouter } from "../app.routes.jsx";
import { roomsApi } from "../api/rooms.api.js";
import { getUserInitials, getUserColor } from "../utils/colors.js";

// Modular Landing Page Components
import LandingNavbar from "../components/landing/LandingNavbar.jsx";
import LandingHero from "../components/landing/LandingHero.jsx";
import LandingHowItWorks from "../components/landing/LandingHowItWorks.jsx";
import LandingWorkspaces from "../components/landing/LandingWorkspaces.jsx";
import LandingComparison from "../components/landing/LandingComparison.jsx";
import LandingFAQ from "../components/landing/LandingFAQ.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import CreateWorkspaceModal from "../components/landing/modals/CreateWorkspaceModal.jsx";
import DeleteWorkspaceModal from "../components/landing/modals/DeleteWorkspaceModal.jsx";

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
  const { user } = useAuth();
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
  const [systemContext, setSystemContext] = useState("");
  const [isRolling, setIsRolling] = useState(false);

  // Recent Rooms State & Deletion State
  const [recentRooms, setRecentRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);



  // Fetch active rooms from backend API
  useEffect(() => {
    let isMounted = true;
    async function fetchRooms() {
      try {
        const json = await roomsApi.getAll();
        if (json.success && Array.isArray(json.data) && isMounted) {
          setRecentRooms(json.data);
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
  const handleExecuteLaunch = async (e) => {
    e?.preventDefault();
    const finalRoomId =
      roomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-") || "workspace-1";
    if (userName.trim() && typeof localStorage !== "undefined") {
      localStorage.setItem("mindmesh_username", userName.trim());
    }
    setIsLaunchModalOpen(false);
    toast.info(`Entering workspace #${finalRoomId}...`);

    // Seed room in PostgreSQL with mode and AI persona
    try {
      await roomsApi.create({
        roomId: finalRoomId,
        name: roomName.trim() || finalRoomId,
        mode: roomMode,
        systemContext: systemContext.trim() || null,
      });
    } catch (err) {
      console.warn("[LandingPage] Pre-seeding room info warning:", err?.message || err);
    }

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
      await roomsApi.delete(targetRoomId);
      setRecentRooms((prev) => prev.filter((r) => r.id !== targetRoomId));
      toast.success(`Workspace "${roomToDelete.name || targetRoomId}" permanently deleted.`);
      setRoomToDelete(null);
    } catch (err) {
      console.error("[LandingPage] Could not delete room:", err);
      toast.error(err.response?.data?.message || "Failed to delete workspace.");
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

      {/* 1. Navbar — auth state is self-managed via useAuth() */}
      <LandingNavbar
        onLaunchDemo={handleLaunchDemo}
        onLaunchNewWorkspace={() => setIsLaunchModalOpen(true)}
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

        {/* 4. Dynamic Workspaces Section — preview of 4 rooms max */}
        <LandingWorkspaces
          user={user}
          rooms={recentRooms}
          isLoading={isLoadingRooms}
          onNavigateToRoom={navigateToRoom}
          onLaunchDemo={handleLaunchDemo}
        />

        {/* 5. Modern Comparison */}
        <LandingComparison />

        {/* 6. Split Editorial FAQ (All closed by default) */}
        <LandingFAQ />
      </main>

      {/* 7. Enterprise SaaS Footer */}
      <LandingFooter
        onLaunchDemo={handleLaunchDemo}
      />

      {/* Focused Launch Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        userName={userName}
        setUserName={setUserName}
        roomName={roomName}
        setRoomName={setRoomName}
        roomMode={roomMode}
        setRoomMode={setRoomMode}
        systemContext={systemContext}
        setSystemContext={setSystemContext}
        onRandomize={rollRoomSlug}
        isRolling={isRolling}
        onSubmit={handleExecuteLaunch}
        userColor={userColor}
        userInitials={userInitials}
      />

      {/* In-App Workspace Deletion Confirmation Modal */}
      <DeleteWorkspaceModal
        room={roomToDelete}
        isDeleting={isDeletingRoom}
        onConfirm={handleExecuteDeleteRoom}
        onClose={() => setRoomToDelete(null)}
      />
    </div>
  );
}


