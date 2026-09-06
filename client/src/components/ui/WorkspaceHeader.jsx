import { useState } from "react";
import { useRoom } from "../../hooks/useRoom.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  Sparkles,
  ExternalLink,
  HelpCircle,
  X,
  Layers,
} from "lucide-react";

export default function WorkspaceHeader({
  isActivityStreamOpen,
  onToggleActivityStream,
  proposedCount = 0,
  isSpeechSimOpen = false,
  onToggleSpeechSim,
  onOpenAuth,
}) {
  const { roomId, currentUser, isConnected, peers } = useRoom();
  const { logout } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isMarcus = currentUser.id === "demo-user-2";
  const alternateUrl = isMarcus ? window.location.pathname : `${window.location.pathname}?as=marcus`;
  const alternateLabel = isMarcus ? "Switch to Elena (Lead)" : "Open Marcus in 2nd Tab";

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent hidden sm:inline">
            mindMesh
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Room Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" : "bg-rose-400"
            }`}
          />
          <span className="text-slate-300 font-mono font-medium">{roomId}</span>
        </div>
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Phase 5 Speech Simulator Toggle Button */}
        <button
          type="button"
          onClick={onToggleSpeechSim}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
            isSpeechSimOpen
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400/60 shadow-md shadow-violet-500/20"
              : "text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border-slate-800"
          }`}
          title="Toggle Real-Time Speech Intelligence Simulator"
        >
          <span className="text-sm">🎙️</span>
          <span className="hidden md:inline">Dialogue Sim</span>
          {isSpeechSimOpen && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        {/* Identity & Multi-tab switch */}
        <a
          href={alternateUrl}
          target="_blank"
          rel="noreferrer"
          title="Open second identity in new tab to test real-time collaboration"
          className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-sky-300 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          <span>{alternateLabel}</span>
        </a>

        {/* Peer Presence Cluster */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {/* Active Local User */}
          <div
            title={`You: ${currentUser.name} (${currentUser.role})`}
            className="w-7 h-7 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm ring-1 ring-sky-400/80 cursor-default"
            style={{ backgroundColor: currentUser.color || "#38bdf8" }}
          >
            {currentUser.avatar || "ME"}
          </div>

          {/* Remote Peers */}
          {peers.map((peer) => (
            <div
              key={peer.socketId}
              title={`Collaborator: ${peer.user?.name || "Peer"} (${peer.user?.role || "Member"})`}
              className="w-7 h-7 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm ring-1 ring-emerald-400 animate-in fade-in zoom-in-75 duration-200"
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Sign in or register an account"
          >
            <span className="hidden sm:inline">Sign In</span>
            <span className="sm:hidden">Login</span>
          </button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{currentUser.name}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-9 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                <div className="px-2 py-1.5 border-b border-slate-800 mb-1">
                  <div className="font-semibold text-slate-200 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
                  <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                    {currentUser.role || "Member"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors font-medium"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}

        {/* Activity Stream Drawer Button */}
        <button
          type="button"
          onClick={onToggleActivityStream}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
            isActivityStreamOpen
              ? "bg-violet-600/30 text-violet-200 border-violet-500/60 shadow-sm shadow-violet-500/20"
              : "text-slate-400 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800/80 border-slate-800"
          }`}
          title="Toggle AI Activity Stream"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="hidden sm:inline">AI Activity</span>
          {proposedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950 ml-0.5">
              {proposedCount}
            </span>
          )}
        </button>

        {/* Help shortcuts button */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Canvas navigation tips"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Help Modal Popup */}
      {showHelp && (
        <div className="absolute top-16 right-4 w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 backdrop-blur-xl z-50 text-xs">
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
              <span className="text-slate-400">Cancel action:</span>
              <span className="font-mono text-slate-200">Esc key</span>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
