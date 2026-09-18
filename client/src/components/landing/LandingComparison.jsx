import { Check, X } from "lucide-react";

const USUAL_WAY = [
  "Someone stops talking to type notes, or nobody does and it's all forgotten",
  "Decisions live in chat scrollback, sticky notes, or nowhere at all",
  "Follow-ups get compiled by hand, hours after the meeting ended",
  "Exporting to Slack or Notion means copy-pasting from memory",
];

const MINDMESH_WAY = [
  "Goals, decisions, tasks, and risks are extracted the moment they're said",
  "Everything lands on a live canvas, attributed to who said it and when",
  "The graph is already organized before the call ends — nothing to compile",
  "One click commits the whole session to Slack, Notion, and email",
];

export default function LandingComparison() {
  return (
    <section id="compare" className="w-full max-w-3xl mx-auto space-y-10 sm:space-y-12 select-none scroll-mt-24">
      <div className="space-y-2">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">
          The Comparison
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif italic font-medium text-text-main tracking-tight">
          What a meeting usually costs you
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle border border-border-subtle rounded-2xl overflow-hidden">
        <div className="p-6 sm:p-8 space-y-5 bg-surface-subtle/60">
          <h3 className="text-sm font-semibold text-text-faint uppercase tracking-wide">The usual way</h3>
          <ul className="space-y-4">
            {USUAL_WAY.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm text-text-muted leading-relaxed">
                <X className="w-3.5 h-3.5 text-text-faint mt-1 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 sm:p-8 space-y-5 bg-surface">
          <h3 className="text-sm font-semibold text-accent uppercase tracking-wide">With mindMesh</h3>
          <ul className="space-y-4">
            {MINDMESH_WAY.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm text-text-main leading-relaxed">
                <Check className="w-3.5 h-3.5 text-accent mt-1 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
