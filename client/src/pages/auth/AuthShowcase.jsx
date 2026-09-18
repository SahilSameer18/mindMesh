import { Layers, Brain, UserPlus } from "lucide-react";
import BrandLogo from "../../components/ui/BrandLogo.jsx";
import { useRouter } from "../../app.routes.jsx";

const FEATURES = [
  {
    icon: Layers,
    title: "Multi-player spatial canvas",
    description:
      "Live cursors, infinite pan and zoom, and cards that cluster themselves by topic as the conversation moves.",
    badge: "Real-time",
  },
  {
    icon: Brain,
    title: "Live synthesis, not transcription",
    description:
      "Speech is continuously turned into structured decisions, tasks, and risks — attributed to whoever said it.",
    badge: "AI Powered",
  },
  {
    icon: UserPlus,
    title: "Frictionless room invites",
    description:
      "Share a link. Teammates join as guests and start talking — no registration wall in the way.",
    badge: "Guest Engine",
  },
];

const FACTS = [
  { value: "60fps", label: "Spatial Canvas" },
  { value: "Zero", label: "Manual Typing" },
  { value: "4", label: "Max Per Room" },
];

/**
 * The dark cover of the ledger — the light form panel is the pages inside.
 */
export default function AuthShowcase() {
  const { navigateToHome } = useRouter();

  return (
    <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative bg-[#14110C] text-[#F3ECDD] flex-col p-8 xl:p-10 overflow-hidden select-none">
      {/* Warm ink glows, not neon */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/[0.12] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-28 right-0 w-96 h-96 bg-amber-500/[0.06] rounded-full blur-[140px] pointer-events-none" />

      {/* Logo row — clickable, with the live indicator folded in instead of its own row */}
      <button
        type="button"
        onClick={() => navigateToHome()}
        className="relative z-10 flex items-center gap-2.5 self-start group cursor-pointer"
        title="mindMesh Home"
      >
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-on-accent shadow-md group-hover:bg-accent-hover transition-colors">
          <BrandLogo size={18} className="text-on-accent" />
        </div>
        <span className="font-serif italic font-medium text-xl tracking-tight text-[#F3ECDD]">
          mindMesh
        </span>
        <span className="flex items-center gap-1.5 ml-1 pl-2.5 border-l border-[#F3ECDD]/15 text-[10px] font-mono uppercase tracking-widest text-[#8A8478]">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
          Live
        </span>
      </button>

      {/* Main Content & Feature Stack */}
      <div className="relative z-10 flex-1 flex flex-col justify-center min-h-0 py-6">
        <div className="max-w-lg mb-6">
          <h2 className="text-2xl xl:text-3xl font-serif italic font-medium tracking-tight text-[#F3ECDD] leading-snug">
            Think, synthesize, and align — in real time.
          </h2>
          <p className="mt-2.5 text-sm text-[#8A8478] leading-relaxed font-sans">
            The collaborative workspace that turns spoken conversation into a living,
            interactive knowledge graph.
          </p>
        </div>

        {/* Feature Cards — warm ink surfaces, not glassmorphic navy */}
        <div className="space-y-2.5">
          {FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative rounded-xl p-3.5 bg-[#1C1812]/70 hover:bg-[#1C1812] border border-[#F3ECDD]/[0.08] hover:border-accent/30 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-300"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-accent/10 border-accent/25 text-accent transition-transform group-hover:scale-105 duration-300">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-[#F3ECDD] group-hover:text-accent transition-colors">
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border border-[#F3ECDD]/15 text-[#8A8478] shrink-0">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#8A8478] leading-relaxed font-sans">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom facts strip — true of the product, not invented metrics */}
      <div className="relative z-10 pt-4 border-t border-[#F3ECDD]/10 flex items-center gap-6 xl:gap-8 text-[#8A8478] shrink-0">
        {FACTS.map((fact) => (
          <div key={fact.label}>
            <div className="text-lg font-bold font-serif text-[#F3ECDD]">{fact.value}</div>
            <div className="text-[11px] uppercase tracking-wider">{fact.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
