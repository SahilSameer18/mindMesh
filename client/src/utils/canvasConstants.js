export const DEFAULT_ROOM_ID = "demo-room";

export const ACTION_TYPES = {
  CREATE_NODE: "CREATE_NODE",
  UPDATE_NODE: "UPDATE_NODE",
  DELETE_NODE: "DELETE_NODE",
  MOVE_NODE: "MOVE_NODE",
  CREATE_EDGE: "CREATE_EDGE",
  DELETE_EDGE: "DELETE_EDGE",
};

export const NODE_TYPES = {
  GOAL: "goal",
  IDEA: "idea",
  TASK: "task",
  DECISION: "decision",
  QUESTION: "question",
  RISK: "risk",
  PERSON: "person",
  IMAGE: "image",
};

export const EDGE_TYPES = {
  BLOCKS: "blocks",
  DEPENDS_ON: "depends_on",
  LEADS_TO: "leads_to",
  SUPPORTS: "supports",
  CONTRADICTS: "contradicts",
  RELATED_TO: "related_to",
  ASSIGNED_TO: "assigned_to",
  PART_OF: "part_of",
};

export const NODE_CONFIGS = {
  goal: {
    label: "Goal",
    icon: "Target",
    color: "#f59e0b",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    glowClass: "glow-amber",
    borderClass: "border-amber-300/80 hover:border-amber-500 shadow-card",
    accentBg: "bg-amber-500/10",
  },
  idea: {
    label: "Idea",
    icon: "Lightbulb",
    color: "#0284c7",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
    glowClass: "glow-sky",
    borderClass: "border-sky-300/80 hover:border-sky-500 shadow-card",
    accentBg: "bg-sky-500/10",
  },
  task: {
    label: "Task",
    icon: "CheckSquare",
    color: "#059669",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    glowClass: "glow-emerald",
    borderClass: "border-emerald-300/80 hover:border-emerald-500 shadow-card",
    accentBg: "bg-emerald-500/10",
  },
  decision: {
    label: "Decision",
    icon: "CheckCircle2",
    color: "#6366f1",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
    glowClass: "glow-indigo",
    borderClass: "border-indigo-300/80 hover:border-indigo-500 shadow-card",
    accentBg: "bg-indigo-500/10",
  },
  question: {
    label: "Question",
    icon: "HelpCircle",
    color: "#9333ea",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
    glowClass: "glow-purple",
    borderClass: "border-purple-300/80 hover:border-purple-500 shadow-card",
    accentBg: "bg-purple-500/10",
  },
  risk: {
    label: "Risk",
    icon: "AlertTriangle",
    color: "#e11d48",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
    glowClass: "glow-rose",
    borderClass: "border-rose-300/80 hover:border-rose-500 shadow-card",
    accentBg: "bg-rose-500/10",
  },
  person: {
    label: "Person",
    icon: "User",
    color: "#475569",
    badgeBg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
    glowClass: "",
    borderClass: "border-slate-300 hover:border-slate-400 shadow-card dark:border-slate-600/50 dark:hover:border-slate-500/70",
    accentBg: "bg-slate-500/10",
  },
  image: {
    label: "Visual",
    icon: "Image",
    color: "#db2777",
    badgeBg: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30",
    glowClass: "",
    borderClass: "border-pink-300/80 hover:border-pink-500 shadow-card",
    accentBg: "bg-pink-500/10",
  },
};

export const EDGE_CONFIGS = {
  blocks: { color: "#f43f5e", label: "blocks", strokeDasharray: "none", strokeWidth: 2.5 },
  depends_on: { color: "#f59e0b", label: "depends on", strokeDasharray: "6 4", strokeWidth: 2 },
  leads_to: { color: "#10b981", label: "leads to", strokeDasharray: "none", strokeWidth: 2 },
  supports: { color: "#38bdf8", label: "supports", strokeDasharray: "none", strokeWidth: 2 },
  contradicts: { color: "#f97316", label: "contradicts", strokeDasharray: "4 4", strokeWidth: 2 },
  related_to: { color: "#64748b", label: "relates to", strokeDasharray: "none", strokeWidth: 1.5 },
  assigned_to: { color: "#818cf8", label: "assigned to", strokeDasharray: "4 4", strokeWidth: 2 },
  part_of: { color: "#a855f7", label: "part of", strokeDasharray: "none", strokeWidth: 2 },
};



