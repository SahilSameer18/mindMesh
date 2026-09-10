import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useRoom } from "../../hooks/useRoom.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { roomsApi } from "../../api/rooms.api.js";
import {
  CheckCircle2,
  HelpCircle,
  Radio,
  Zap,
  Brain,
  AlertCircle,
  Mic,
  PhoneOff,
  Check,
  Copy,
  Sparkles,
} from "lucide-react";
import BrandLogo from "./BrandLogo.jsx";
import UserProfileMenu from "./menus/UserProfileMenu.jsx";
import CanvasShortcutsModal from "./modals/CanvasShortcutsModal.jsx";
import LeaveMeetingModal from "./modals/LeaveMeetingModal.jsx";

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
    systemContext,
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  const userMenuRef = useRef(null);
  const helpMenuRef = useRef(null);

  // Close menus and modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowLeaveModal(false);
        setShowUserMenu(false);
        setShowHelp(false);
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
    if (typeof onLeaveRoom === "function") {
      onLeaveRoom();
    } else {
      window.location.href = "/";
    }
  };

  const handleExecuteDeleteRoom = async () => {
    setIsDeletingRoom(true);
    try {
      await roomsApi.delete(roomId);
      toast.success(`Workspace "${roomId}" permanently deleted.`);
      setShowLeaveModal(false);
      handleLeaveCall();
    } catch (err) {
      console.error("[WorkspaceHeader] Error deleting room:", err);
      toast.error(err.response?.data?.message || "Failed to delete workspace.");
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

        {/* Active AI Persona Badge */}
        {systemContext && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50/80 border border-indigo-200/60 text-indigo-700 text-xs font-medium dark:bg-indigo-950/30 dark:border-indigo-800/40 dark:text-indigo-300 max-w-[260px] shadow-xs cursor-help select-none"
            title={`Active AI Persona: "${systemContext}"`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">
              {systemContext.length > 28 ? `${systemContext.slice(0, 26)}…` : systemContext}
            </span>
          </div>
        )}
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
          <div ref={userMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-main bg-surface-subtle border border-border-subtle hover:border-border-strong transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{currentUser.name}</span>
            </button>

            <UserProfileMenu
              isOpen={showUserMenu}
              onClose={() => setShowUserMenu(false)}
              currentUser={currentUser}
              onSaveName={(name) => {
                updateDisplayName(name);
                toast.success(`Display name updated to ${name}`);
              }}
              onLogout={handleUserLogout}
              onOpenLeaveModal={() => setShowLeaveModal(true)}
            />
          </div>
        )}

        {/* Help shortcuts button */}
        <div ref={helpMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
            title="Canvas navigation tips"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <CanvasShortcutsModal
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
          />
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

      {/* Google Meet-Style Leave Confirmation Modal */}
      <LeaveMeetingModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        roomId={roomId}
        onConfirmLeave={handleLeaveCall}
        onConfirmDelete={handleExecuteDeleteRoom}
        isDeleting={isDeletingRoom}
      />
    </header>
  );
}
