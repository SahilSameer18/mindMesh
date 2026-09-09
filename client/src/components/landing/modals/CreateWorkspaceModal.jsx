import { createPortal } from "react-dom";
import { X, Dices, Zap, Brain, ArrowRight } from "lucide-react";
import BrandLogo from "../../ui/BrandLogo.jsx";

/**
 * Focused Launch Workspace Modal.
 * Prompts display name, room slug, and meeting mode.
 */
export function CreateWorkspaceModal({
  isOpen,
  onClose,
  userName,
  setUserName,
  roomName,
  setRoomName,
  roomMode,
  setRoomMode,
  onRandomize,
  isRolling = false,
  onSubmit,
  userColor = "#6366f1",
  userInitials = "ME",
}) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-text-main/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-subtle rounded-2xl sm:rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-elevated space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
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

        <form onSubmit={onSubmit} className="space-y-4 pt-1">
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
                onClick={onRandomize}
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
                <Zap
                  className={`w-3.5 h-3.5 transition-all duration-300 ${
                    roomMode === "operational"
                      ? "text-sky-500 fill-sky-500/20 scale-110"
                      : "text-text-muted/60 scale-100"
                  }`}
                />
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
  );
}

export default CreateWorkspaceModal;
