import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Users } from "lucide-react";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

export default function GuestJoinModal({ isOpen, onClose, roomId, inviteUrl }) {
  const [copied, setCopied] = useState(false);

  useEscapeKey(() => onClose?.(), isOpen);

  if (!isOpen || typeof document === "undefined") return null;

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(window.location.origin + inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-join-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/20 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="max-w-md w-full rounded-2xl bg-surface border border-border-subtle p-6 shadow-elevated relative text-left animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 id="guest-join-modal-title" className="text-base font-semibold text-text-main font-serif italic">Invite Collaborators</h3>
            <p className="text-xs text-text-muted">Anyone with this link can join as a guest</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-main uppercase tracking-wider mb-1.5">
              Room Invite Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-main font-mono truncate">
                {typeof window !== "undefined" ? window.location.origin + (inviteUrl || `/join/...`) : (inviteUrl || `/join/...`)}
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-muted">
            Guests receive temporary 8-hour sessions with scoped access to room #{roomId?.slice(0, 8)}.
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}