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
      "mindMesh features a transparent dual-engine failover architecture. If primary inference experiences any latency spikes, secondary verification takes over in under 100 milliseconds, guaranteeing zero dropped thoughts during intense product discussions.",
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
        {/* Left Column: Bold Editorial Title & Subtitle */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold shadow-sm">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Support & Documentation</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-[1.15]">
            Your Questions,{" "}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Our Answers.
            </span>
          </h2>

          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md">
            Everything you need to know about real-time speech intelligence, privacy safeguards,
            living spatial graphs, and automated team synthesis.
          </p>

          <div className="pt-2">
            <a
              href="mailto:support@mindmesh.local"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200 shadow-sm group cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
              <span>Have a question? Reach out to our team</span>
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
                    ? "bg-slate-900/95 border-indigo-500/50 shadow-xl shadow-indigo-500/10"
                    : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80"
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
                      isOpen ? "text-white" : "text-slate-200 group-hover:text-white"
                    }`}
                  >
                    {faq.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg transition-all duration-300 ease-in-out shrink-0 ${
                      isOpen
                        ? "rotate-180 text-indigo-300 bg-indigo-500/20 scale-105"
                        : "rotate-0 text-slate-400 bg-slate-800/80 group-hover:text-slate-200 group-hover:bg-slate-700/80"
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
                    <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60">
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
