import {
  Calendar,
  ChevronRight,
  Zap,
  Brain,
  Shield,
  CheckCircle2,
  Play,
  UserPlus,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "../../app.routes.jsx";

export default function LandingWorkspaces({
  user,
  rooms = [],
  isLoading = false,
  onNavigateToRoom,
  onLaunchDemo,
}) {
  const { navigateToDashboard, navigateToRegister } = useRouter();

  // Show only 4 rooms as a preview — full list is on /dashboard
  const previewRooms = rooms.slice(0, 4);

  return (
    <section id="workspaces" className="w-full max-w-5xl mx-auto space-y-6 select-none scroll-mt-24">
      {user ? (
        /* ── Authenticated View: 4-Room Preview ── */
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif italic font-medium text-text-main flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                <span>Recent Workspaces</span>
              </h2>
              <p className="text-xs text-text-muted">
                Your 4 most recent rooms — manage all in the Dashboard
              </p>
            </div>

            {/* "View All" shortcut */}
            <button
              type="button"
              onClick={() => navigateToDashboard()}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-accent hover:bg-accent/10 border border-accent/25 transition-all duration-200 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>View All in Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Room Cards (4 max) */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-surface-subtle border border-border-subtle animate-pulse space-y-3"
                >
                  <div className="h-4 bg-surface-hover rounded w-2/3" />
                  <div className="flex items-center gap-2">
                    <div className="h-3 bg-surface-hover rounded w-16" />
                    <div className="h-3 bg-surface-hover rounded w-12" />
                  </div>
                  <div className="h-8 bg-surface-hover rounded-lg w-full mt-2" />
                </div>
              ))}
            </div>
          ) : previewRooms.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {previewRooms.map((room) => {
                  const isBrainstorm = room.mode === "brainstorm";
                  const nodeCount = room._count?.nodes || 0;
                  return (
                    <div
                      key={room.id}
                      className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-accent/40 transition-all flex flex-col justify-between group space-y-3 shadow-subtle hover:shadow-elevated cursor-pointer"
                      onClick={() => onNavigateToRoom(room.id)}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-sm font-bold text-text-main group-hover:text-accent transition-colors line-clamp-1 flex-1">
                            {room.name || room.id}
                          </span>
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                              isBrainstorm
                                ? "bg-accent/10 text-accent border-accent/25"
                                : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/40"
                            }`}
                          >
                            {isBrainstorm ? <Brain className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                          </span>
                        </div>

                        <div className="text-[11px] text-text-muted font-mono flex items-center gap-2">
                          <span className="text-text-main font-medium">
                            {nodeCount} {nodeCount === 1 ? "card" : "cards"}
                          </span>
                          <span>·</span>
                          <span>
                            {room.updatedAt
                              ? new Date(room.updatedAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Recently"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-accent group-hover:gap-2 transition-all">
                        <span>Open Canvas</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* "Manage All" CTA below the cards */}
              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={() => navigateToDashboard()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-surface border border-border-subtle hover:border-accent/40 text-text-muted hover:text-accent transition-all duration-200 cursor-pointer shadow-subtle"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Manage all {rooms.length} workspace{rooms.length !== 1 ? "s" : ""} →
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="p-8 rounded-2xl bg-surface border border-dashed border-border-subtle text-center space-y-3">
              <p className="text-sm text-text-main font-semibold">No workspaces yet</p>
              <p className="text-xs text-text-muted">
                Launch a meeting room above to start organizing spoken knowledge.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── Guest View: Marketing Teaser (unchanged) ── */
        <div className="relative rounded-2xl sm:rounded-3xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-elevated overflow-hidden">
          {/* Ambient Glow Accent */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* Left Info */}
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-[11px] font-semibold text-accent">
                <Shield className="w-3.5 h-3.5" />
                <span>Cloud Synchronization</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif italic font-medium text-text-main tracking-tight">
                Save and sync your workspaces across devices
              </h2>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Guest sessions are great for fast one-off brainstorms. Create a free account to keep your living graphs,
                manage team permissions, and export meeting synthesis directly to Slack and Notion.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-text-main font-medium">Permanent workspace history</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-text-main font-medium">Multi-user collaboration & audio</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-text-main font-medium">Slack & Notion meeting commit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-text-main font-medium">Groq + Gemini dual AI synthesis</span>
                </div>
              </div>
            </div>

            {/* Right CTAs */}
            <div className="flex flex-col gap-2.5 sm:min-w-[220px] shrink-0">
              <button
                type="button"
                onClick={() => navigateToRegister()}
                className="w-full py-3 px-5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Free Account</span>
              </button>

              <button
                type="button"
                onClick={onLaunchDemo}
                className="text-center text-[11px] text-text-muted hover:text-accent transition-colors pt-1 cursor-pointer flex items-center justify-center gap-1"
              >
                <Play className="w-3 h-3 text-accent fill-accent" />
                <span>Or explore interactive demo room</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
