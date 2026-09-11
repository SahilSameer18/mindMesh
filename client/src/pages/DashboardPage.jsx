import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Zap,
  Brain,
  Layers,
  Users,
  MessageSquare,
  LayoutDashboard,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  LogIn,
} from "lucide-react";
import { roomsApi } from "../api/rooms.api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRouter } from "../app.routes.jsx";
import LandingNavbar from "../components/landing/LandingNavbar.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";
import CreateWorkspaceModal from "../components/landing/modals/CreateWorkspaceModal.jsx";
import DeleteWorkspaceModal from "../components/landing/modals/DeleteWorkspaceModal.jsx";
import { getUserInitials, getUserColor } from "../utils/colors.js";

const COOL_ROOM_SLUGS = [
  "aurora-sprint", "quantum-design", "matrix-sync", "nexus-architecture",
  "prism-roadmap", "hyper-brainstorm", "pulse-retro", "orbit-ops",
  "vortex-strategy", "zenith-sprint",
];

const MODE_FILTERS = ["all", "operational", "brainstorm", "solo"];

export default function WorkspacePage() {
  const { user } = useAuth();
  const { navigateToRoom, navigateToHome, navigateToLogin } = useRouter();

  // Room list state
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all");

  // Copy link feedback
  const [copiedId, setCopiedId] = useState(null);

  // Create modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomName, setRoomName] = useState(() => COOL_ROOM_SLUGS[Math.floor(Math.random() * COOL_ROOM_SLUGS.length)]);
  const [roomMode, setRoomMode] = useState("operational");
  const [systemContext, setSystemContext] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [userName, setUserName] = useState(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem("mindmesh_username") || user?.name || "" : user?.name || ""
  );

  // Delete modal
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  // Fetch rooms
  const fetchRooms = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const json = await roomsApi.getAll();
      if (json?.success && Array.isArray(json.data)) {
        setRooms(json.data);
      }
    } catch (err) {
      console.warn("[Dashboard] Could not fetch rooms:", err);
      toast.error("Failed to load workspaces.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Filtered rooms
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      !searchQuery ||
      room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = modeFilter === "all" || room.mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  // Handlers
  const handleCreateRoom = async (e) => {
    e?.preventDefault();
    const finalRoomId = roomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-") || "workspace-1";
    if (userName.trim() && typeof localStorage !== "undefined") {
      localStorage.setItem("mindmesh_username", userName.trim());
    }
    setIsCreateModalOpen(false);
    toast.info(`Creating workspace #${finalRoomId}...`);
    try {
      await roomsApi.create({
        roomId: finalRoomId,
        name: roomName.trim() || finalRoomId,
        mode: roomMode,
        systemContext: systemContext.trim() || null,
      });
    } catch (err) {
      console.warn("[Dashboard] Room pre-seed warning:", err?.message);
    }
    navigateToRoom(finalRoomId);
  };

  const handleDeleteClick = (e, room) => {
    e.stopPropagation();
    setRoomToDelete(room);
  };

  const handleExecuteDelete = async () => {
    if (!roomToDelete) return;
    setIsDeletingRoom(true);
    try {
      await roomsApi.delete(roomToDelete.id);
      setRooms((prev) => prev.filter((r) => r.id !== roomToDelete.id));
      toast.success(`Workspace "${roomToDelete.name || roomToDelete.id}" deleted.`);
      setRoomToDelete(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete workspace.");
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const handleCopyLink = (e, roomId) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopiedId(roomId);
    toast.success("Room link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const rollRoomSlug = () => {
    setIsRolling(true);
    setTimeout(() => {
      const filtered = COOL_ROOM_SLUGS.filter((s) => s !== roomName);
      setRoomName(filtered[Math.floor(Math.random() * filtered.length)]);
      setIsRolling(false);
    }, 180);
  };

  const userInitials = getUserInitials(userName || user?.name || "Guest");
  const userColor = getUserColor(userName || user?.name || "Guest");

  return (
    <div className="min-h-screen w-full bg-app text-text-main flex flex-col">
      {/* Shared Navbar — self-contained via useAuth/useRouter */}
      <LandingNavbar
        onLaunchNewWorkspace={() => setIsCreateModalOpen(true)}
        onLaunchDemo={() => navigateToRoom("demo-room")}
      />

      {/* Page Content — pt-16 to clear fixed navbar */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-main tracking-tight">
                Dashboard
              </h1>
            </div>
            <p className="text-sm text-text-muted">
              {user
                ? `All your workspaces, ${user.name?.split(" ")[0]}. Create, manage, and jump straight in.`
                : "Browse live collaborative rooms or sign in to manage your own."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchRooms(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-border-subtle bg-surface text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer disabled:opacity-50"
              title="Refresh rooms"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* New Room */}
            {user ? (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 border border-white/10 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Room</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateToLogin()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Row ── */}
        {!isLoading && rooms.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Rooms", value: rooms.length, icon: Layers, color: "text-indigo-600" },
              { label: "Total Cards", value: rooms.reduce((s, r) => s + (r._count?.nodes || 0), 0), icon: Zap, color: "text-violet-600" },
              { label: "Transcripts", value: rooms.reduce((s, r) => s + (r._count?.transcriptChunks || 0), 0), icon: MessageSquare, color: "text-sky-600" },
              { label: "Members", value: rooms.reduce((s, r) => s + (r._count?.members || 0), 0), icon: Users, color: "text-emerald-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-1 shadow-subtle">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </div>
                <p className="text-2xl font-bold text-text-main font-display">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Search & Filter Bar ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms by name or ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-border-subtle text-sm text-text-main placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
            />
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1.5 bg-surface border border-border-subtle rounded-xl p-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted ml-2 shrink-0" />
            {MODE_FILTERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize cursor-pointer ${
                  modeFilter === m
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* ── Room Grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-surface border border-border-subtle animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-surface-hover rounded w-1/2" />
                  <div className="h-5 bg-surface-hover rounded-full w-20" />
                </div>
                <div className="flex gap-3">
                  <div className="h-3 bg-surface-hover rounded w-16" />
                  <div className="h-3 bg-surface-hover rounded w-12" />
                  <div className="h-3 bg-surface-hover rounded w-14" />
                </div>
                <div className="h-9 bg-surface-hover rounded-xl w-full mt-1" />
              </div>
            ))}
          </div>
        ) : filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const isBrainstorm = room.mode === "brainstorm";
              const isSolo = room.mode === "solo";
              const nodeCount = room._count?.nodes || 0;
              const memberCount = room._count?.members || 0;
              const transcriptCount = room._count?.transcriptChunks || 0;

              return (
                <div
                  key={room.id}
                  className="group p-5 rounded-2xl bg-surface border border-border-subtle hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all flex flex-col gap-4 shadow-subtle hover:shadow-elevated cursor-pointer"
                  onClick={() => navigateToRoom(room.id)}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-main group-hover:text-indigo-600 transition-colors truncate">
                        {room.name || room.id}
                      </p>
                      <p className="text-[11px] text-text-faint font-mono truncate mt-0.5">{room.id}</p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                        isBrainstorm
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30"
                          : isSolo
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                          : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30"
                      }`}
                    >
                      {isBrainstorm ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                      <span className="capitalize">{room.mode || "operational"}</span>
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span className="text-text-main font-medium">{nodeCount}</span> cards
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span className="text-text-main font-medium">{memberCount}</span> members
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span className="text-text-main font-medium">{transcriptCount}</span>
                    </span>
                    <span className="ml-auto text-text-faint">
                      {new Date(room.createdAt || Date.now()).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
                    {/* Copy link */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, room.id)}
                      className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer"
                      title="Copy invite link"
                    >
                      {copiedId === room.id
                        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete (authenticated only) */}
                    {user && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, room)}
                        className="p-2 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
                        title={`Delete ${room.name || room.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Open Canvas CTA */}
                    <button
                      type="button"
                      onClick={() => navigateToRoom(room.id)}
                      className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-subtle hover:bg-indigo-600 text-xs font-semibold text-text-main hover:text-white border border-border-subtle transition-all cursor-pointer shadow-subtle"
                    >
                      Open Canvas
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : rooms.length === 0 ? (
          /* No rooms at all */
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-100 to-violet-100 dark:from-indigo-500/10 dark:to-violet-500/10 flex items-center justify-center">
              <Layers className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <p className="text-base font-bold text-text-main">No workspaces yet</p>
              <p className="text-sm text-text-muted mt-1">Create your first room to start a collaborative session.</p>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                Create First Room
              </button>
            )}
          </div>
        ) : (
          /* Search/filter returned nothing */
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Search className="w-8 h-8 text-text-faint" />
            <p className="text-sm font-semibold text-text-main">No rooms match your search</p>
            <p className="text-xs text-text-muted">Try a different name or clear the filter.</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setModeFilter("all"); }}
              className="text-xs text-indigo-600 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>

      {/* Shared Footer */}
      <LandingFooter onLaunchDemo={() => navigateToRoom("demo-room")} />

      {/* Create Room Modal (reused from landing) */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
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
        onSubmit={handleCreateRoom}
        userColor={userColor}
        userInitials={userInitials}
      />

      {/* Delete Confirmation Modal */}
      <DeleteWorkspaceModal
        room={roomToDelete}
        isDeleting={isDeletingRoom}
        onConfirm={handleExecuteDelete}
        onClose={() => setRoomToDelete(null)}
      />
    </div>
  );
}