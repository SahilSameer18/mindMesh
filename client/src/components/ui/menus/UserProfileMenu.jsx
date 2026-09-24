import { useState } from "react";
import { Edit2, LogOut, PhoneOff, Moon, Sun } from "lucide-react";
import { useTheme } from "../../../hooks/useTheme.js";

/**
 * User Identity and Session Management dropdown menu.
 */
export function UserProfileMenu({
  isOpen,
  onClose,
  currentUser,
  onSaveName,
  onLogout,
  onOpenLeaveModal,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.name || "");
  const { theme, toggleTheme } = useTheme();

  if (!isOpen || !currentUser) return null;

  const handleSubmitName = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onSaveName?.(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div
      className="absolute right-0 top-9 w-52 rounded-xl bg-surface border border-border-subtle shadow-elevated p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs space-y-1"
    >
      <div className="px-2.5 py-2 border-b border-border-subtle">
        <div className="font-semibold text-text-main truncate">{currentUser.name}</div>
        <div className="text-[10px] text-text-muted truncate">
          {currentUser.email || "Guest Collaborator"}
        </div>
        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-mono">
          {currentUser.role || "Member"}
        </span>
      </div>

      {/* Edit Display Name */}
      {isEditingName ? (
        <form onSubmit={handleSubmitName} className="p-1.5 space-y-1.5">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="New display name"
            className="w-full px-2 py-1 rounded bg-surface-subtle border border-border-subtle text-xs text-text-main outline-none focus:border-accent"
            autoFocus
          />
          <div className="flex gap-1">
            <button
              type="submit"
              className="px-2 py-0.5 bg-accent text-white rounded text-[10px] cursor-pointer"
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

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full text-left px-2 py-1.5 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-main transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </button>

      {/* Log Out */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full text-left px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors font-medium flex items-center gap-2 cursor-pointer group"
      >
        <LogOut className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        <span>Log Out</span>
      </button>

      {/* Leave Meeting from Menu */}
      <button
        type="button"
        onClick={() => {
          onClose?.();
          onOpenLeaveModal?.();
        }}
        className="w-full text-left px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors font-medium flex items-center gap-1.5 border-t border-border-subtle pt-1.5 cursor-pointer"
      >
        <PhoneOff className="w-3 h-3" />
        <span>Leave Meeting</span>
      </button>
    </div>
  );
}

export default UserProfileMenu;
