import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Layers,
} from "lucide-react";

export default function VisualLightboxModal({ node, onClose }) {
  const [isCopied, setIsCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!node || !node.metadata?.imageUrl) return null;

  const imageUrl = node.metadata.imageUrl;
  const prompt = node.metadata.prompt || node.text || "Generated Visual Concept";

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy image URL:", err);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `mindmesh-visual-${node.id.slice(0, 8)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download image directly, opening in new tab:", err);
      window.open(imageUrl, "_blank");
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 dark:bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-elevated overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-subtle shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40">
                  Visual Concept
                </span>
                <span className="text-[11px] text-text-muted font-mono hidden sm:inline truncate">
                  Node #{node.id.slice(0, 8)}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-text-main truncate max-w-[280px] sm:max-w-md mt-0.5">
                {prompt}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyUrl}
              className="p-1.5 text-text-muted hover:text-sky-600 dark:hover:text-sky-300 hover:bg-surface-subtle rounded-lg transition-colors"
              title="Copy Image URL"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 text-text-muted hover:text-sky-600 dark:hover:text-sky-300 hover:bg-surface-subtle rounded-lg transition-colors"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </button>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-text-muted hover:text-sky-600 dark:hover:text-sky-300 hover:bg-surface-subtle rounded-lg transition-colors"
              title="Open Original in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className="h-4 w-px bg-border-subtle mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-subtle rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-surface-subtle/50 relative min-h-[300px]">
          {/* Rule 7: Skeleton Loader over raw spinner */}
          {!imgLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="w-64 h-48 rounded-xl bg-surface border border-border-subtle flex flex-col items-center justify-center p-4 animate-pulse relative overflow-hidden shadow-inner">
                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border-subtle flex items-center justify-center text-sky-500/70 mb-3">
                  <ImageIcon className="w-5 h-5 animate-pulse" />
                </div>
                <div className="h-2.5 w-36 bg-surface-subtle rounded-full mb-2" />
                <div className="h-2 w-24 bg-surface-subtle/60 rounded-full" />
              </div>
              <span className="text-xs font-semibold text-text-muted mt-3 animate-pulse">
                Buffering high-resolution visual concept...
              </span>
              <span className="text-[11px] text-text-muted/60 mt-0.5">Visual Concept Engine</span>
            </div>
          )}

          <img
            src={imageUrl}
            alt={prompt}
            onLoad={() => setImgLoaded(true)}
            className={`max-h-[65vh] w-auto max-w-full rounded-xl border border-border-subtle shadow-card object-contain transition-all duration-300 ${
              imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          />
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-3 border-t border-border-subtle bg-surface-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-text-muted">
            <span className="flex items-center gap-1 text-text-main font-medium">
              <ImageIcon className="w-3.5 h-3.5 text-violet-500" /> Prompt:
            </span>
            <span className="italic text-text-main line-clamp-1 max-w-md">{prompt}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span className="px-2 py-0.5 rounded bg-surface border border-border-subtle font-mono text-text-main">
              Concept / 1024x768
            </span>
            <span>High-Resolution Render</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
