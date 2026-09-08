import { Mic, Cpu, Layers, ArrowRight } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: Mic,
    title: "Speak Naturally",
    badge: "<10ms Real-Time Audio",
    badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    iconBg: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    desc: "Unmute and run your meeting normally. High-accuracy speech recognition streams captions with zero lag.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "Automatic Semantic Structure",
    badge: "Zero Manual Typing",
    badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    iconBg: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    desc: "Intelligent extraction identifies Goals, Decisions, Tasks, and Risks, automatically resolving assignees and quotes.",
  },
  {
    step: "03",
    icon: Layers,
    title: "Living Graph & 1-Click Commit",
    badge: "60fps Spatial Canvas",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    desc: "Ideas auto-arrange into hierarchical dependency maps that sync directly to Slack, Notion databases, and email summaries.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 select-none scroll-mt-24">
      <div className="text-center space-y-2">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
          How It Works
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
          From voice to visual execution in seconds
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          No typing meeting notes. No stalled follow-ups. Spoken thoughts instantly become actionable nodes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative">
        {STEPS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="relative p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/90 shadow-xl backdrop-blur-xl transition-all group flex flex-col justify-between space-y-4"
            >
              {/* Top Row: Step Number & Badge */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-black text-slate-700 group-hover:text-indigo-400/60 transition-colors">
                  {item.step}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              </div>

              {/* Icon & Title */}
              <div className="space-y-2">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm ${item.iconBg}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {/* Progress Connector (Desktop only) */}
              {idx < 2 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shadow-md">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
