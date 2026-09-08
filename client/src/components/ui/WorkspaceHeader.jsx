import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useRoom } from "../../hooks/useRoom.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  X,
  Layers,
  Radio,
  Zap,
  Brain,
  AlertCircle,
  AlertTriangle,
  Mic,
  PhoneOff,
  Check,
  Copy,
  User,
  Edit2,
  Trash2,
} from "lucide-react";
import BrandLogo from "./BrandLogo.jsx";

export default function WorkspaceHeader({
  onOpenAuth,
  isListening = false,
  onToggleMic,
  micStatus = "idle",
  onLeaveRoom,
}) {
  const {
    roomId,
    currentUser,
    isConnected,
    peers,
    socket,
    roomMode,
    updateRoomMode,
    activePresenter,
    isFollowing,
    startPresenting,
    stopPresenting,
    setFollowing,
    presenterContestError,
    latestMeetingReport,
    setIsCommitModalOpen,
    isCommitting,
    commitError,
    updateDisplayName,
  } = useRoom();

  const { logout } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const userMenuRef = useRef(null);
  const helpMenuRef = useRef(null);

  // Close menus and modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowLeaveModal(false);
        setShowUserMenu(false);
        setShowHelp(false);
        setIsEditingName(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
        setIsEditingName(false);
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target)) {
        setShowHelp(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        toast.success("Room invite link copied to clipboard!");
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {
        toast.error("Could not copy link to clipboard.");
      });
    }
  };

  const handleSaveName = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      updateDisplayName(nameInput.trim());
      setIsEditingName(false);
      toast.success(`Display name updated to ${nameInput.trim()}`);
    }
  };

  const handleUserLogout = () => {
    setShowUserMenu(false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("mindmesh_username");
      localStorage.removeItem("mindmesh_userid");
    }
    updateDisplayName("");
    logout();
    toast.info("Logged out / identity reset.");
  };

  const handleLeaveCall = () => {
    setShowLeaveModal(false);
    setShowDeleteConfirm(false);
    if (typeof onLeaveRoom === "function") {
      onLeaveRoom();
    } else {
      window.location.href = "/";
    }
  };

  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  const handleExecuteDeleteRoom = async () => {
    setIsDeletingRoom(true);
    try {
      const apiBase =
        import.meta.env.VITE_SERVER_URL ||
        (typeof window !== "undefined" && window.location.port === "5173"
          ? `${window.location.protocol}//${window.location.hostname}:3000`
          : "");

      const res = await fetch(`${apiBase}/api/rooms/${encodeURIComponent(roomId)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success(`Workspace "${roomId}" permanently deleted.`);
        setShowLeaveModal(false);
        setShowDeleteConfirm(false);
        handleLeaveCall();
      } else {
        toast.error("Failed to delete room from server.");
      }
    } catch (err) {
      console.error("[WorkspaceHeader] Error deleting room:", err);
      toast.error("Network error while deleting room.");
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const isLocalUserPresenter = activePresenter?.socketId === socket?.id;

  return (
    <header className="h-14 border-b border-border-subtle bg-surface/90 backdrop-blur-xl px-2 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none gap-2 shadow-subtle">
      {/* Brand, Room Info & Meeting Mode Selector */}
      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
          title="mindMesh Home"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <BrandLogo size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-text-main hidden sm:inline">
            mindMesh
          </span>
        </a>

        <div className="h-4 w-px bg-border-subtle hidden sm:block" />

        {/* Room Badge & Share Trigger */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-subtle border border-border-subtle text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className="text-text-main font-mono font-medium max-w-[65px] sm:max-w-none truncate">{roomId}</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-0.5 text-text-muted hover:text-text-main rounded transition-colors ml-0.5 cursor-pointer"
            title="Copy shareable room link to invite teammates"
          >
            {copiedLink ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Phase 6 Adaptive Mode Selector (Linear-Style Sliding Segmented Control) */}
        <div className="relative hidden md:grid grid-cols-2 p-0.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs shadow-subtle select-none">
          {/* Animated Sliding Background Indicator */}
          <div
            className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-lg bg-surface shadow-subtle border border-border-subtle transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none will-change-transform ${
              roomMode === "brainstorm" ? "translate-x-full" : "translate-x-0"
            }`}
          />

          {/* Button 1: Operational */}
          <button
            type="button"
            onClick={() => updateRoomMode("operational")}
            className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors duration-200 cursor-pointer ${
              roomMode === "operational"
                ? "text-text-main font-semibold"
                : "text-text-muted hover:text-text-main font-medium"
            }`}
            title="Operational Mode: Structured outline, action items, and topic columns"
          >
            <Zap
              className={`w-3.5 h-3.5 transition-all duration-300 ${
                roomMode === "operational"
                  ? "text-sky-500 fill-sky-500/20 scale-110"
                  : "text-text-muted/60 scale-100"
              }`}
            />
            <span>Operational</span>
          </button>

          {/* Button 2: Brainstorm */}
          <button
            type="button"
            onClick={() => updateRoomMode("brainstorm")}
            className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors duration-200 cursor-pointer ${
              roomMode === "brainstorm"
                ? "text-text-main font-semibold"
                : "text-text-muted hover:text-text-main font-medium"
            }`}
            title="Brainstorm Mode: Organic visual clustering and creative association"
          >
            <Brain
              className={`w-3.5 h-3.5 transition-all duration-300 ${
                roomMode === "brainstorm"
                  ? "text-purple-500 fill-purple-500/20 scale-110"
                  : "text-text-muted/60 scale-100"
              }`}
            />
            <span>Brainstorm</span>
          </button>
        </div>
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Phase 6 Presenter Broadcast / Follow Me Button */}
        <div className="relative flex items-center">
          {isLocalUserPresenter ? (
            <button
              type="button"
              onClick={() => stopPresenting()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 shadow-sm transition-all animate-pulse dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 dark:border-rose-500/50"
              title="You are currently broadcasting your screen to followers. Click to stop."
            >
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Broadcasting (Stop)</span>
            </button>
          ) : activePresenter ? (
            <button
              type="button"
              onClick={() => setFollowing(!isFollowing)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                isFollowing
                  ? "bg-violet-100 text-violet-800 border-violet-300 shadow-sm dark:bg-violet-600/30 dark:text-violet-200 dark:border-violet-500/60"
                  : "bg-surface-subtle text-text-main hover:bg-surface-hover border-border-subtle"
              }`}
              title={isFollowing ? "Click to stop following presenter" : "Click to follow presenter"}
            >
              <Radio className={`w-3.5 h-3.5 ${isFollowing ? "text-violet-600 animate-pulse" : "text-text-muted"}`} />
              <span className="hidden sm:inline">
                {isFollowing ? `Following ${activePresenter.user?.name?.split(" ")[0] || "Presenter"}` : `Follow ${activePresenter.user?.name?.split(" ")[0] || "Presenter"}`}
              </span>
              <span className="sm:hidden">{isFollowing ? "Following" : "Follow"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startPresenting()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-subtle hover:bg-surface-hover text-text-main border border-border-subtle transition-colors cursor-pointer"
              title="Broadcast your screen coordinates to followers"
            >
              <Radio className="w-3.5 h-3.5 text-text-muted" />
              <span className="hidden sm:inline">Follow Me</span>
            </button>
          )}

          {/* Inline Contested Presenter Alert Badge */}
          {presenterContestError && (
            <div className="absolute top-10 right-0 whitespace-nowrap px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 dark:bg-amber-950/95 dark:border-amber-500/80 dark:text-amber-200 text-[11px] font-medium shadow-elevated flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{presenterContestError}</span>
            </div>
          )}
        </div>

        {/* Phase 8B Live Voice Dictation Button */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            isListening
              ? "bg-rose-50 text-rose-700 border-rose-300 shadow-sm animate-pulse dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/60"
              : "text-text-main hover:bg-surface-hover bg-surface-subtle border-border-subtle"
          }`}
          title={isListening ? "Mute Live Voice Dictation (Hotkey: M)" : "Start Live Voice Dictation (Hotkey: M)"}
        >
          {isListening ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              <Mic className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden md:inline">Listening</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-text-muted" />
              <span className="hidden md:inline">Dictate</span>
            </>
          )}
        </button>

        {/* Phase 7 Commit Call Button */}
        <button
          type="button"
          onClick={() => setIsCommitModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-subtle border border-violet-500/20 transition-all duration-200 active:scale-95 group relative shrink-0 cursor-pointer"
          title="Commit meeting synthesis, review decisions, and export to Slack / Notion / Email"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-violet-200 group-hover:scale-110 transition-transform" />
          <span className="font-medium tracking-tight hidden sm:inline">
            {latestMeetingReport ? "Meeting Report" : "Commit Call"}
          </span>
          <span className="font-medium tracking-tight sm:hidden">
            {latestMeetingReport ? "Report" : "Commit"}
          </span>
          {latestMeetingReport ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ) : isCommitting ? (
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
          ) : commitError ? (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`Synthesis error: ${commitError}`} />
          ) : null}
        </button>

        {/* Peer Presence Cluster */}
        <div className="flex items-center -space-x-1.5 overflow-hidden shrink-0">
          {/* Active Local User */}
          <div
            title={`You: ${currentUser.name} (${currentUser.role})`}
            className="w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white shadow-subtle ring-1 ring-sky-500/80 cursor-default shrink-0"
            style={{ backgroundColor: currentUser.color || "#0284c7" }}
          >
            {currentUser.avatar || "ME"}
          </div>

          {/* Remote Peers */}
          {peers.map((peer) => (
            <div
              key={peer.socketId}
              title={`Collaborator: ${peer.user?.name || "Peer"} (${peer.user?.role || "Member"})`}
              className="w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white shadow-subtle ring-1 ring-emerald-500 animate-in fade-in zoom-in-75 duration-200 shrink-0"
              style={{ backgroundColor: peer.user?.color || "#059669" }}
            >
              {peer.user?.avatar || "P"}
            </div>
          ))}
        </div>

        {/* Auth / Account Trigger */}
        {currentUser.isDemo ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-text-main bg-surface-subtle hover:bg-surface-hover border border-border-subtle transition-colors shrink-0 cursor-pointer"
            title="Sign in or register an account"
          >
            <span className="hidden sm:inline">Sign In</span>
            <span className="sm:hidden">Login</span>
          </button>
        ) : (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-main bg-surface-subtle border border-border-subtle hover:border-border-strong transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{currentUser.name}</span>
            </button>

            {showUserMenu && (
              <div
                ref={userMenuRef}
                className="absolute right-0 top-9 w-52 rounded-xl bg-surface border border-border-subtle shadow-elevated p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs space-y-1"
              >
                <div className="px-2.5 py-2 border-b border-border-subtle">
                  <div className="font-semibold text-text-main truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-text-muted truncate">{currentUser.email || "Guest Collaborator"}</div>
                  <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-mono dark:bg-sky-500/20 dark:text-sky-300">
                    {currentUser.role || "Member"}
                  </span>
                </div>

                {/* Edit Display Name */}
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="p-1.5 space-y-1.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="New display name"
                      className="w-full px-2 py-1 rounded bg-surface-subtle border border-border-subtle text-xs text-text-main outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        type="submit"
                        className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="px-2 py-0.5 bg-surface-subtle text-text-muted hover:text-text-main rounded text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(currentUser.name);
                      setIsEditingName(true);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-main transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-text-muted" />
                    <span>Change Name</span>
                  </button>
                )}

                {/* Log Out & Clear Identity */}
                <button
                  type="button"
                  onClick={handleUserLogout}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3 h-3" />
                  <span>Log Out / Reset Name</span>
                </button>

                {/* Leave Meeting from Menu */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowLeaveModal(true);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors font-medium flex items-center gap-1.5 border-t border-border-subtle pt-1.5 cursor-pointer"
                >
                  <PhoneOff className="w-3 h-3" />
                  <span>Leave Meeting</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Help shortcuts button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
            title="Canvas navigation tips"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Help Modal Popup */}
          {showHelp && (
            <div
              ref={helpMenuRef}
              className="absolute top-10 right-0 w-80 bg-surface border border-border-subtle rounded-2xl shadow-elevated p-4 backdrop-blur-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle mb-3">
                <span className="font-semibold text-text-main flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Canvas Shortcuts
                </span>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-text-muted hover:text-text-main p-1 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="space-y-2 text-text-main">
                <li className="flex justify-between">
                  <span className="text-text-muted">Pan canvas:</span>
                  <span className="font-mono text-text-main">Space + Drag or Click &amp; Drag</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-muted">Zoom view:</span>
                  <span className="font-mono text-text-main">Mouse Wheel</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-muted">Edit text:</span>
                  <span className="font-mono text-text-main">Double click card</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-muted">Link cards:</span>
                  <span className="font-mono text-text-main">Drag/click right handle</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-muted">Dictation:</span>
                  <span className="font-mono text-text-main">M key</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-muted">Cancel action:</span>
                  <span className="font-mono text-text-main">Esc key</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Google Meet-Style Leave Call Button (Always Visible) */}
        <button
          type="button"
          onClick={() => setShowLeaveModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-rose-700/30 transition-all active:scale-95 ml-1 shrink-0 cursor-pointer"
          title="Leave meeting and return to home"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>Leave</span>
        </button>
      </div>

      {/* Google Meet-Style Leave Confirmation Modal (Rendered to body via createPortal to prevent clipping) */}
      {showLeaveModal && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            setShowLeaveModal(false);
            setShowDeleteConfirm(false);
          }}
        >
          <div
            className="bg-surface border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-elevated space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowLeaveModal(false);
                setShowDeleteConfirm(false);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {showDeleteConfirm ? (
              /* Step 2: Danger In-App Confirmation Card */
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-subtle animate-pulse dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 pt-0.5">
                    <h3 id="leave-modal-title" className="text-base font-bold text-text-main tracking-tight">
                      Permanently Delete Workspace?
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      This will permanently wipe workspace <span className="font-mono text-text-main font-semibold">#{roomId}</span> and remove all cards, connections, transcripts, and summaries for all teammates.
                    </p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold pt-1">
                      ⚠️ This action is irreversible.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-border-subtle gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingRoom}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-text-main hover:bg-surface-hover bg-surface-subtle border border-border-subtle transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDeleteRoom}
                    disabled={isDeletingRoom}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeletingRoom ? "Deleting Workspace..." : "Yes, Delete Everything"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Step 1: Standard Leave Meeting Dialog */
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0 shadow-sm shadow-rose-500/10 dark:bg-rose-500/25 dark:border-rose-500/40 dark:text-rose-300">
                    <PhoneOff className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 pt-0.5">
                    <h3 id="leave-modal-title" className="text-base font-bold text-text-main tracking-tight">
                      Leave Meeting Room?
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      You will disconnect from live audio dictation and collaborative canvas updates. All cards and notes remain saved in this workspace.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border-subtle gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400/80 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Permanently delete this workspace and wipe all cards from database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Room</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLeaveModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-text-main hover:bg-surface-hover bg-surface-subtle border border-border-subtle transition-colors cursor-pointer"
                    >
                      Stay
                    </button>
                    <button
                      type="button"
                      onClick={handleLeaveCall}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>Leave Call</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
