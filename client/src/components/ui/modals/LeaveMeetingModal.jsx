import { useState } from "react";
import { createPortal } from "react-dom";
import { PhoneOff, AlertTriangle, Trash2, X } from "lucide-react";

/**
 * Google Meet-Style Leave Meeting & Danger Delete Workspace Dialog.
 * Rendered to document.body via createPortal to prevent z-index and clipping issues.
 */
export function LeaveMeetingModal({
  isOpen,
  onClose,
  roomId,
  onConfirmLeave,
  onConfirmDelete,
  isDeleting = false,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || typeof document === "undefined") return null;

  const handleClose = () => {
    setShowDeleteConfirm(false);
    onClose?.();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-modal-title"
      className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="bg-surface border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-elevated space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
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
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-main hover:bg-surface-hover bg-surface-subtle border border-border-subtle transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirmDelete?.()}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting Workspace..." : "Yes, Delete Everything"}</span>
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
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-main hover:bg-surface-hover bg-surface-subtle border border-border-subtle transition-colors cursor-pointer"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmLeave?.()}
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
  );
}

export default LeaveMeetingModal;
