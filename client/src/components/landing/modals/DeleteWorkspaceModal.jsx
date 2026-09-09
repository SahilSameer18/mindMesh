import { createPortal } from "react-dom";
import { X, AlertTriangle, Trash2 } from "lucide-react";

/**
 * In-App Workspace Deletion Confirmation Dialog.
 */
export function DeleteWorkspaceModal({ room, isDeleting = false, onConfirm, onClose }) {
  if (!room || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-text-main/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !isDeleting && onClose?.()}
    >
      <div
        className="bg-surface border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-elevated space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => !isDeleting && onClose?.()}
          className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-xs animate-pulse">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 pt-0.5">
            <h3 className="text-base font-bold text-text-main tracking-tight">
              Delete Workspace Permanently?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Permanently delete workspace{" "}
              <span className="font-mono text-text-main font-semibold">
                #{room.name || room.id}
              </span>
              ? All cards, relationships, audio transcripts, and meeting summaries will be wiped from the database.
            </p>
            <p className="text-[11px] text-rose-600 font-medium pt-1">
              ⚠️ This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-border-subtle gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-main bg-surface-subtle hover:bg-surface-hover border border-border-subtle transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Deleting Workspace..." : "Delete Permanently"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DeleteWorkspaceModal;
