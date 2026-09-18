import { Mic, Cpu, Layers } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: Mic,
    title: "Speak naturally",
    tag: "<10ms audio",
    desc: "Unmute and run your meeting normally. High-accuracy speech recognition streams captions with zero lag — nobody changes how they talk.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "It files itself",
    tag: "zero manual typing",
    desc: "Extraction identifies goals, decisions, tasks, and risks as they're said, resolving assignees and quotes automatically.",
  },
  {
    step: "03",
    icon: Layers,
    title: "One commit, everywhere",
    tag: "60fps spatial canvas",
    desc: "Ideas arrange themselves into a dependency map that syncs to Slack, Notion, and email summaries with a single click.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="w-full max-w-3xl mx-auto space-y-10 sm:space-y-12 select-none scroll-mt-24">
      <div className="space-y-2">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">
          How It Works
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif italic font-medium text-text-main tracking-tight">
          From voice to visual execution in seconds
        </h2>
      </div>

      <div className="divide-y divide-border-subtle border-t border-b border-border-subtle">
        {STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="grid grid-cols-[auto_1fr] sm:grid-cols-[5rem_1fr] gap-4 sm:gap-8 py-7 sm:py-9 group"
            >
              <span className="font-mono text-3xl sm:text-4xl font-medium text-border-strong group-hover:text-accent transition-colors tabular-nums">
                {item.step}
              </span>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-main tracking-tight">
                    {item.title}
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-wide text-text-faint">
                    {item.tag}
                  </span>
                </div>
                <p className="text-sm text-text-muted leading-relaxed max-w-lg">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
