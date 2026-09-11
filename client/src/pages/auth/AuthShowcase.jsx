import { Sparkles, Brain, ShieldCheck, ArrowUpRight } from "lucide-react";
import BrandLogo from "../../components/ui/BrandLogo.jsx";

export default function AuthShowcase() {
  const features = [
    {
      icon: Sparkles,
      iconColor: "text-sky-600 bg-sky-50 border-sky-200",
      title: "Multi-Player Spatial Canvas",
      description:
        "Sub-15ms cursor presence, infinite pan & zoom, fluid semantic node clustering, and independent context zones.",
      badge: "Real-time",
    },
    {
      icon: Brain,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
      title: "Autonomous Live Synthesis",
      description:
        "Continuous AI audio transcription instantly converted into structured decisions, actionable tasks, and risk tags.",
      badge: "AI Powered",
    },
    {
      icon: ShieldCheck,
      iconColor: "text-purple-600 bg-purple-50 border-purple-200",
      title: "Frictionless Room Invites",
      description:
        "Tokenized disposable invite links. Teammates and clients collaborate immediately without registration barriers.",
      badge: "Guest Engine",
    },
  ];

  return (
    <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative bg-surface-subtle/60 border-r border-border-subtle flex-col justify-between p-10 xl:p-14 overflow-hidden select-none">
      {/* Ambient Background Glows matching current site theme */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-tr from-indigo-200/50 via-violet-100/40 to-sky-100/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-purple-100/40 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-28 left-1/4 w-96 h-96 bg-sky-100/50 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-subtle shadow-subtle">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-text-main tracking-wider uppercase font-mono">
            mindMesh Spatial Engine
          </span>
        </div>

        <span className="text-xs text-text-muted font-mono">v4.2 Production</span>
      </div>

      {/* Main Content & Feature Stack */}
      <div className="relative z-10 my-auto py-8">
        <div className="max-w-lg mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25">
              <BrandLogo size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-text-main">
              mindMesh
            </span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-display font-bold tracking-tight text-text-main leading-snug">
            Think, synthesize &amp; align{" "}
            <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              in real-time space.
            </span>
          </h2>
          <p className="mt-3 text-sm xl:text-base text-text-muted leading-relaxed font-sans">
            The collaborative intelligence workspace that turns spoken conversation into living,
            interactive knowledge graphs.
          </p>
        </div>

        {/* Feature Cards matching current site style */}
        <div className="space-y-3.5">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl p-4 xl:p-4.5 bg-surface/90 hover:bg-surface border border-border-subtle shadow-card transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.iconColor} transition-transform group-hover:scale-105 duration-300`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-text-main group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed font-sans">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Performance Metrics Strip */}
      <div className="relative z-10 pt-4 border-t border-border-subtle flex items-center justify-between text-text-muted">
        <div className="flex items-center gap-6 xl:gap-8">
          <div>
            <div className="text-lg font-bold font-display text-text-main">15ms</div>
            <div className="text-[11px] text-text-faint uppercase tracking-wider">Sync Latency</div>
          </div>
          <div className="h-7 w-px bg-border-subtle" />
          <div>
            <div className="text-lg font-bold font-display text-text-main">Zero</div>
            <div className="text-[11px] text-text-faint uppercase tracking-wider">Conflict Replicas</div>
          </div>
          <div className="h-7 w-px bg-border-subtle" />
          <div>
            <div className="text-lg font-bold font-display text-text-main">15-min</div>
            <div className="text-[11px] text-text-faint uppercase tracking-wider">Rotating Tokens</div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700 cursor-pointer transition-colors">
          <span>Explore platform</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
