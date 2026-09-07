import { useState, useEffect } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Visual Concept
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline truncate">
                  Node #{node.id.slice(0, 8)}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 truncate max-w-[280px] sm:max-w-md mt-0.5">
                {prompt}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyUrl}
              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition-colors"
              title="Copy Image URL"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition-colors"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </button>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition-colors"
              title="Open Original in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-950/40 relative min-h-[300px]">
          {/* Rule 7: Skeleton Loader over raw spinner */}
          {!imgLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="w-64 h-48 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col items-center justify-center p-4 animate-pulse relative overflow-hidden shadow-inner">
                <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-sky-400/70 mb-3">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="h-2.5 w-36 bg-slate-800 rounded-full mb-2" />
                <div className="h-2 w-24 bg-slate-800/50 rounded-full" />
              </div>
              <span className="text-xs font-semibold text-slate-400 mt-3 animate-pulse">
                Buffering high-resolution visual concept...
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">Pollinations Flux Engine</span>
            </div>
          )}

          <img
            src={imageUrl}
            alt={prompt}
            onLoad={() => setImgLoaded(true)}
            className={`max-h-[65vh] w-auto max-w-full rounded-xl border border-slate-800 shadow-2xl object-contain transition-all duration-300 ${
              imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          />
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Prompt:
            </span>
            <span className="italic text-slate-200 line-clamp-1 max-w-md">{prompt}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300">
              Flux / 1024x768
            </span>
            <span>Zero-Key Pollinations AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
