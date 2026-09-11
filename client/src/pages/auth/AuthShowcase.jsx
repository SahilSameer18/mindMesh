import { Sparkles, Brain, ShieldCheck, ArrowUpRight } from "lucide-react";
import BrandLogo from "../../components/ui/BrandLogo.jsx";

export default function AuthShowcase() {
  const features = [
    {
      icon: Sparkles,
      iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      title: "Multi-Player Spatial Canvas",
      description:
        "Sub-15ms cursor presence, infinite pan & zoom, fluid semantic node clustering, and independent context zones.",
      badge: "Real-time",
      badgeStyle: "text-sky-300 bg-sky-500/15 border-sky-500/30",
    },
    {
      icon: Brain,
      iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      title: "Autonomous Live Synthesis",
      description:
        "Continuous AI audio transcription instantly converted into structured decisions, actionable tasks, and risk tags.",
      badge: "AI Powered",
      badgeStyle: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30",
    },
    {
      icon: ShieldCheck,
      iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      title: "Frictionless Room Invites",
      description:
        "Tokenized disposable invite links. Teammates and clients collaborate immediately without registration barriers.",
      badge: "Guest Engine",
      badgeStyle: "text-purple-300 bg-purple-500/15 border-purple-500/30",
    },
  ];

  return (
    <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative bg-[#090D16] text-slate-100 border-r border-[#1E293B] flex-col justify-between p-10 xl:p-14 overflow-hidden select-none">
      {/* Atmospheric Dark Neon Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-28 left-1/4 w-96 h-96 bg-sky-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/[0.08] shadow-lg shadow-black/20 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-slate-200 tracking-wider uppercase font-mono">
            mindMesh Spatial Engine
          </span>
        </div>

        <span className="text-xs text-slate-400 font-mono">v4.2 Production</span>
      </div>

      {/* Main Content & Feature Stack */}
      <div className="relative z-10 my-auto py-8">
        <div className="max-w-lg mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <BrandLogo size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">
              mindMesh
            </span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-display font-bold tracking-tight text-white leading-snug">
            Think, synthesize &amp; align{" "}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              in real-time space.
            </span>
          </h2>
          <p className="mt-3 text-sm xl:text-base text-slate-400 leading-relaxed font-sans">
            The collaborative intelligence workspace that turns spoken conversation into living,
            interactive knowledge graphs.
          </p>
        </div>

        {/* Feature Cards matching dark glassmorphic design */}
        <div className="space-y-3.5">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl p-4 xl:p-4.5 bg-slate-900/60 hover:bg-slate-900/90 border border-white/[0.08] hover:border-indigo-500/30 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.iconColor} transition-transform group-hover:scale-105 duration-300 shadow-sm`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${item.badgeStyle}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Performance Metrics Strip */}
      <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-6 xl:gap-8">
          <div>
            <div className="text-lg font-bold font-display text-white">15ms</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Sync Latency</div>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div>
            <div className="text-lg font-bold font-display text-white">Zero</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Conflict Replicas</div>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div>
            <div className="text-lg font-bold font-display text-white">15-min</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Rotating Tokens</div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold hover:text-indigo-300 cursor-pointer transition-colors">
          <span>Explore platform</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
