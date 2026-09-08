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
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-2 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none gap-2">
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
          <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent hidden sm:inline">
            mindMesh
          </span>
        </a>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Room Badge & Share Trigger */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" : "bg-rose-400"
            }`}
          />
          <span className="text-slate-300 font-mono font-medium max-w-[65px] sm:max-w-none truncate">{roomId}</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-0.5 text-slate-400 hover:text-white rounded transition-colors ml-0.5"
            title="Copy shareable room link to invite teammates"
          >
            {copiedLink ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Phase 6 Adaptive Mode Selector */}
        <div className="hidden md:flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => updateRoomMode("operational")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all ${
              roomMode === "operational"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Operational Mode: Structured outline, action items, and topic columns"
          >
            <Zap className="w-3 h-3 text-sky-400" />
            <span>Operational</span>
          </button>
          <button
            type="button"
            onClick={() => updateRoomMode("brainstorm")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all ${
              roomMode === "brainstorm"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Brainstorm Mode: Organic visual clustering and creative association"
          >
            <Brain className="w-3 h-3 text-purple-400" />
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 shadow-sm transition-all animate-pulse"
              title="You are currently broadcasting your screen to followers. Click to stop."
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Broadcasting (Stop)</span>
            </button>
          ) : activePresenter ? (
            <button
              type="button"
              onClick={() => setFollowing(!isFollowing)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                isFollowing
                  ? "bg-violet-600/30 text-violet-200 border-violet-500/60 shadow-sm shadow-violet-500/20"
                  : "bg-slate-900/90 text-slate-300 hover:text-white border-slate-800"
              }`}
              title={isFollowing ? "Click to stop following presenter" : "Click to follow presenter"}
            >
              <Radio className={`w-3.5 h-3.5 ${isFollowing ? "text-violet-400 animate-pulse" : "text-slate-400"}`} />
              <span className="hidden sm:inline">
                {isFollowing ? `Following ${activePresenter.user?.name?.split(" ")[0] || "Presenter"}` : `Follow ${activePresenter.user?.name?.split(" ")[0] || "Presenter"}`}
              </span>
              <span className="sm:hidden">{isFollowing ? "Following" : "Follow"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startPresenting()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
              title="Broadcast your screen coordinates to followers"
            >
              <Radio className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Follow Me</span>
            </button>
          )}

          {/* Inline Contested Presenter Alert Badge */}
          {presenterContestError && (
            <div className="absolute top-10 right-0 whitespace-nowrap px-2.5 py-1 rounded-md bg-amber-950/95 border border-amber-500/80 text-amber-200 text-[11px] font-medium shadow-xl flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{presenterContestError}</span>
            </div>
          )}
        </div>

        {/* Phase 8B Live Voice Dictation Button */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
            isListening
              ? "bg-rose-500/20 text-rose-200 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse"
              : "text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border-slate-800"
          }`}
          title={isListening ? "Mute Live Voice Dictation (Hotkey: M)" : "Start Live Voice Dictation (Hotkey: M)"}
        >
          {isListening ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Listening</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Dictate</span>
            </>
          )}
        </button>

        {/* Phase 7 Commit Call Button */}
        <button
          type="button"
          onClick={() => setIsCommitModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 hover:from-amber-400 hover:via-rose-400 hover:to-violet-500 text-white shadow-md shadow-violet-500/25 border border-white/20 transition-all duration-200 active:scale-95 group relative shrink-0"
          title="Commit meeting synthesis, review decisions, and export to Slack / Notion / Email"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-200 group-hover:scale-110 transition-transform" />
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
            className="w-7 h-7 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm ring-1 ring-sky-400/80 cursor-default shrink-0"
            style={{ backgroundColor: currentUser.color || "#38bdf8" }}
          >
            {currentUser.avatar || "ME"}
          </div>

          {/* Remote Peers */}
          {peers.map((peer) => (
            <div
              key={peer.socketId}
              title={`Collaborator: ${peer.user?.name || "Peer"} (${peer.user?.role || "Member"})`}
              className="w-7 h-7 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm ring-1 ring-emerald-400 animate-in fade-in zoom-in-75 duration-200 shrink-0"
              style={{ backgroundColor: peer.user?.color || "#10b981" }}
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0"
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{currentUser.name}</span>
            </button>

            {showUserMenu && (
              <div
                ref={userMenuRef}
                className="absolute right-0 top-9 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs space-y-1"
              >
                <div className="px-2.5 py-2 border-b border-slate-800">
                  <div className="font-semibold text-slate-200 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser.email || "Guest Collaborator"}</div>
                  <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
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
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        type="submit"
                        className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]"
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
                    className="w-full text-left px-2 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3 h-3 text-slate-400" />
                    <span>Change Name</span>
                  </button>
                )}

                {/* Log Out & Clear Identity */}
                <button
                  type="button"
                  onClick={handleUserLogout}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors font-medium flex items-center gap-1.5"
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
                  className="w-full text-left px-2 py-1.5 rounded-lg text-rose-300 hover:bg-rose-500/20 transition-colors font-medium flex items-center gap-1.5 border-t border-slate-800/80 pt-1.5"
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
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Canvas navigation tips"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Help Modal Popup */}
          {showHelp && (
            <div
              ref={helpMenuRef}
              className="absolute top-10 right-0 w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 backdrop-blur-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" /> Canvas Shortcuts
                </span>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-slate-400 hover:text-white p-1 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="space-y-2 text-slate-300">
                <li className="flex justify-between">
                  <span className="text-slate-400">Pan canvas:</span>
                  <span className="font-mono text-slate-200">Space + Drag or Click & Drag</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Zoom view:</span>
                  <span className="font-mono text-slate-200">Mouse Wheel</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Edit text:</span>
                  <span className="font-mono text-slate-200">Double click card</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Link cards:</span>
                  <span className="font-mono text-slate-200">Drag/click right handle</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Dictation:</span>
                  <span className="font-mono text-slate-200">M key</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Cancel action:</span>
                  <span className="font-mono text-slate-200">Esc key</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Google Meet-Style Leave Call Button (Always Visible) */}
        <button
          type="button"
          onClick={() => setShowLeaveModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/40 border border-rose-500/50 transition-all active:scale-95 ml-1 shrink-0 cursor-pointer"
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            setShowLeaveModal(false);
            setShowDeleteConfirm(false);
          }}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowLeaveModal(false);
                setShowDeleteConfirm(false);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {showDeleteConfirm ? (
              /* Step 2: Danger In-App Confirmation Card (No browser confirm popups) */
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10 animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 pt-0.5">
                    <h3 id="leave-modal-title" className="text-base font-bold text-white tracking-tight">
                      Permanently Delete Workspace?
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      This will permanently wipe workspace <span className="font-mono text-white font-semibold">#{roomId}</span> and remove all cards, connections, transcripts, and summaries for all teammates.
                    </p>
                    <p className="text-[11px] text-rose-400 font-medium pt-1">
                      ⚠️ This action is irreversible.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-slate-800/80 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingRoom}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDeleteRoom}
                    disabled={isDeletingRoom}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                    <PhoneOff className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 pt-0.5">
                    <h3 id="leave-modal-title" className="text-base font-bold text-white tracking-tight">
                      Leave Meeting Room?
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      You will disconnect from live audio dictation and collaborative canvas updates. All cards and notes remain saved in this workspace.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Permanently delete this workspace and wipe all cards from database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Room</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLeaveModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
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
