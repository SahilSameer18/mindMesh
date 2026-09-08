import { Radio, X, AlertCircle } from "lucide-react";

/**
 * Top floating banner indicating active "Follow Me" presenter tracking
 * or displaying inline contested presenter alerts.
 */
export function PresenterFollowBanner({
  activePresenter = null,
  isFollowing = false,
  onStopFollowing = null,
  contestError = null,
  onClearContestError = null,
}) {
  const showBanner = isFollowing && activePresenter;
  const showError = Boolean(contestError);

  if (!showBanner && !showError) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
      {/* 1. Active Following Banner */}
      {showBanner && (
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-full bg-surface/95 backdrop-blur-xl border border-violet-500/40 shadow-elevated text-text-main text-xs font-medium">
          {/* Glowing Red Pulse Indicator */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>

          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-violet-500" />
            <span>Following</span>
            <span className="text-violet-600 dark:text-violet-300 font-semibold">
              {activePresenter.user?.name || "Presenter"}
            </span>
            {activePresenter.user?.role && (
              <span className="text-text-muted font-normal text-[11px]">
                ({activePresenter.user.role})
              </span>
            )}
          </div>

          <span className="text-[10px] text-text-muted hidden sm:inline border-l border-border-subtle pl-2">
            Pan/zoom canvas to detach
          </span>

          <button
            onClick={onStopFollowing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-subtle hover:bg-surface text-text-muted hover:text-text-main border border-border-subtle transition-colors text-[11px]"
          >
            <X className="w-3 h-3" />
            <span>Stop Following</span>
          </button>
        </div>
      )}

      {/* 2. Inline Contested Presenter Alert Pill */}
      {showError && (
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/90 backdrop-blur-xl border border-amber-300 dark:border-amber-500/60 shadow-elevated text-amber-900 dark:text-amber-200 text-xs font-medium animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{contestError}</span>
          {onClearContestError && (
            <button
              onClick={onClearContestError}
              className="p-0.5 hover:bg-amber-100 dark:hover:bg-amber-800/40 rounded text-amber-700 dark:text-amber-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PresenterFollowBanner;
