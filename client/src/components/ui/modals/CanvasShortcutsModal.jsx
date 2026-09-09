import { Layers, X } from "lucide-react";

/**
 * Canvas keyboard navigation and mouse shortcuts cheatsheet modal.
 */
export function CanvasShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="absolute top-10 right-0 w-80 bg-surface border border-border-subtle rounded-2xl shadow-elevated p-4 backdrop-blur-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle mb-3">
        <span id="shortcuts-modal-title" className="font-semibold text-text-main flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Canvas Shortcuts
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-main p-1 rounded cursor-pointer"
          aria-label="Close shortcuts"
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
  );
}

export default CanvasShortcutsModal;
