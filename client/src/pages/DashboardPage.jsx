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
  SlidersHorizontal,
  RefreshCw,
  LogIn,
} from "lucide-react";
import { roomsApi } from "../api/rooms.api.js";
import { useAuth } from "../hooks/useAuth.js";
import { useRouter } from "../app.routes.jsx";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import CreateWorkspaceModal from "../components/landing/modals/CreateWorkspaceModal.jsx";
import DeleteWorkspaceModal from "../components/landing/modals/DeleteWorkspaceModal.jsx";
import { getUserInitials, getUserColor } from "../utils/colors.js";

const COOL_ROOM_SLUGS = [
  "aurora-sprint", "quantum-design", "matrix-sync", "nexus-architecture",
  "prism-roadmap", "hyper-brainstorm", "pulse-retro", "orbit-ops",
  "vortex-strategy", "zenith-sprint",
];

const MODE_FILTERS = ["all", "operational", "brainstorm", "solo"];

const MODE_BADGE = {
  brainstorm: { icon: Brain, className: "bg-amber-50 text-amber-700 border-amber-200" },
  solo: { icon: Layers, className: "bg-surface-hover text-text-main border-border-strong" },
  operational: { icon: Zap, className: "bg-accent/10 text-accent border-accent/25" },
};

export default function WorkspacePage() {
  const { user } = useAuth();
  const { navigateToRoom, navigateToLogin } = useRouter();

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

  // Manual refresh for button or action completion
  const fetchRooms = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const json = await roomsApi.getAll();
      if (json?.success && Array.isArray(json.data)) {
        setRooms(json.data);
      }
    } catch (err) {
      console.warn("[Dashboard] Could not fetch rooms:", err);
      toast.error("Failed to load workspaces.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    let isMounted = true;
    async function loadInitialRooms() {
      try {
        const json = await roomsApi.getAll();
        if (json?.success && Array.isArray(json.data) && isMounted) {
          setRooms(json.data);
        }
      } catch (err) {
        console.warn("[Dashboard] Could not fetch rooms:", err);
        toast.error("Failed to load workspaces.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadInitialRooms();
    return () => {
      isMounted = false;
    };
  }, []);

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
      {/* Dedicated app-shell header — not LandingNavbar, no marketing chrome here */}
      <DashboardHeader />

      {/* Page Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16 space-y-6 sm:space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="w-5 h-5 text-accent" />
              <h1 className="text-2xl sm:text-3xl font-serif italic font-medium text-text-main tracking-tight">
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
              className="p-2 rounded-lg border border-border-subtle bg-surface text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer disabled:opacity-50"
              title="Refresh rooms"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* New Room */}
            {user ? (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Room</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateToLogin()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
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
              { label: "Total Rooms", value: rooms.length, icon: Layers, color: "text-accent" },
              { label: "Total Cards", value: rooms.reduce((s, r) => s + (r._count?.nodes || 0), 0), icon: Zap, color: "text-amber-600" },
              { label: "Transcripts", value: rooms.reduce((s, r) => s + (r._count?.transcriptChunks || 0), 0), icon: MessageSquare, color: "text-text-muted" },
              { label: "Members", value: rooms.reduce((s, r) => s + (r._count?.members || 0), 0), icon: Users, color: "text-emerald-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-1 shadow-subtle transition-all hover:border-border-strong hover:shadow-card">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </div>
                <p className="text-2xl font-bold text-text-main font-serif">{value}</p>
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
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface border border-border-subtle text-sm text-text-main placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all"
            />
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1.5 bg-surface border border-border-subtle rounded-lg p-1 overflow-x-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted ml-2 shrink-0" />
            {MODE_FILTERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize cursor-pointer shrink-0 ${
                  modeFilter === m
                    ? "bg-accent text-on-accent shadow-sm"
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
                <div className="h-9 bg-surface-hover rounded-lg w-full mt-1" />
              </div>
            ))}
          </div>
        ) : filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const nodeCount = room._count?.nodes || 0;
              const memberCount = room._count?.members || 0;
              const transcriptCount = room._count?.transcriptChunks || 0;
              const badge = MODE_BADGE[room.mode] || MODE_BADGE.operational;
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={room.id}
                  className="group p-5 rounded-2xl bg-surface border border-border-subtle hover:border-accent/40 transition-all duration-300 ease-out flex flex-col gap-4 shadow-subtle hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer"
                  onClick={() => navigateToRoom(room.id)}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-main group-hover:text-accent transition-colors truncate">
                        {room.name || room.id}
                      </p>
                      <p className="text-[11px] text-text-faint font-mono truncate mt-0.5">{room.id}</p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${badge.className}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
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
                      {room.createdAt
                        ? new Date(room.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })
                        : "Recently"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
                    {/* Copy link */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, room.id)}
                      className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer"
                      title="Copy room link"
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
                        className="p-2 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title={`Delete ${room.name || room.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Open Canvas CTA */}
                    <button
                      type="button"
                      onClick={() => navigateToRoom(room.id)}
                      className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-subtle hover:bg-accent text-xs font-semibold text-text-main hover:text-on-accent border border-border-subtle transition-all cursor-pointer shadow-subtle"
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
          <div className="flex flex-col items-center justify-center py-20 sm:py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Layers className="w-8 h-8 text-accent" />
            </div>
            <div>
              <p className="text-base font-bold text-text-main">No workspaces yet</p>
              <p className="text-sm text-text-muted mt-1">Create your first room to start a collaborative session.</p>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold transition-all cursor-pointer shadow-sm"
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
              className="text-xs text-accent hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>

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
