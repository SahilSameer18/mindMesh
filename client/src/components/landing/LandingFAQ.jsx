import { useState } from "react";
import { ChevronDown, HelpCircle, Mail } from "lucide-react";

const FAQS = [
  {
    id: "speech-to-graph",
    question: "How does real-time speech-to-graph extraction work?",
    answer:
      "Your browser uses high-accuracy speech intelligence to stream microphone audio locally with zero delay. As participants discuss topics, intelligent semantic extraction classifies spoken thoughts into Goals, Decisions, Tasks, and Risks, updating the interactive living canvas in real time.",
  },
  {
    id: "guest-access",
    question: "Do meeting participants need an account to join?",
    answer:
      "No! mindMesh is completely frictionless. Teammates can join any workspace with an invite link or room code as a guest. Entering their display name automatically creates an avatar and live canvas cursor without passwords or credit cards.",
  },
  {
    id: "privacy-audio",
    question: "How is audio privacy and conversation data protected?",
    answer:
      "mindMesh does not store raw audio recordings on its servers. Voice is transcribed live in memory to extract semantic cards. Your workspace cards and notes are encrypted in your private database, and summaries are only published when you explicitly click 'Commit Call'.",
  },
  {
    id: "exports-integrations",
    question: "Can we export meeting decisions and action items to existing tools?",
    answer:
      "Yes. The 1-Click Meeting Commit engine instantly compiles ratified decisions, task assignees, and executive briefs into structured Slack messages, Notion databases, HTML emails, or downloadable Markdown documentation.",
  },
  {
    id: "ai-failover",
    question: "What happens if there are network latency spikes or heavy discussion?",
    answer:
      "mindMesh features an automatic zero-downtime dual-engine failover architecture. If primary inference experiences any latency spikes or provider rate limits, secondary verification takes over transparently, guaranteeing zero dropped thoughts during intense product discussions.",
  },
];

export default function LandingFAQ() {
  // All questions start closed by default
  const [openId, setOpenId] = useState(null);

  const toggleFAQ = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 select-none scroll-mt-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Bold Editorial Title, Subtitle & Support Box */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border-subtle text-xs text-text-muted font-semibold shadow-subtle">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Support &amp; Documentation</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-text-main tracking-tight leading-[1.15]">
              Your Questions,{" "}
              <span className="bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Our Answers.
              </span>
            </h2>

            <p className="text-text-muted text-xs sm:text-sm leading-relaxed max-w-md">
              Everything you need to know about real-time speech intelligence, privacy safeguards,
              living spatial graphs, and automated team synthesis.
            </p>
          </div>

          {/* Elevated Support Card balancing the column */}
          <div className="p-5 rounded-2xl bg-surface border border-border-subtle shadow-subtle space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-main">
              <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Still have questions?</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Can't find what you're looking for? Reach out directly to our engineering and product team.
            </p>
            <a
              href="mailto:support@mindmesh.local"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30"
            >
              <span>Contact Support &rarr;</span>
            </a>
          </div>
        </div>

        {/* Right Column: Butter-Smooth Interactive Accordion Cards */}
        <div className="lg:col-span-7 space-y-3">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen
                    ? "bg-surface border-indigo-500/60 shadow-elevated"
                    : "bg-surface border-border-subtle hover:border-border-strong hover:bg-surface-hover shadow-subtle"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer group"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                >
                  <span
                    className={`text-sm sm:text-base font-semibold transition-colors duration-200 ${
                      isOpen ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-text-main group-hover:text-indigo-600"
                    }`}
                  >
                    {faq.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg transition-all duration-300 ease-in-out shrink-0 ${
                      isOpen
                        ? "rotate-180 text-indigo-700 bg-indigo-50 dark:bg-indigo-500/20 dark:text-indigo-300 scale-105"
                        : "rotate-0 text-text-muted bg-surface-subtle group-hover:text-text-main group-hover:bg-surface-hover"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Silky-Smooth CSS Grid Accordion Expand/Collapse */}
                <div
                  id={`faq-answer-${faq.id}`}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-text-muted leading-relaxed border-t border-border-subtle">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
