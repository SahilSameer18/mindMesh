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
    badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    glowClass: "glow-amber",
    borderClass: "border-amber-500/40 hover:border-amber-500/70",
    accentBg: "bg-amber-500/10",
  },
  idea: {
    label: "Idea",
    icon: "Lightbulb",
    color: "#38bdf8",
    badgeBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    glowClass: "glow-sky",
    borderClass: "border-sky-500/40 hover:border-sky-500/70",
    accentBg: "bg-sky-500/10",
  },
  task: {
    label: "Task",
    icon: "CheckSquare",
    color: "#10b981",
    badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    glowClass: "glow-emerald",
    borderClass: "border-emerald-500/40 hover:border-emerald-500/70",
    accentBg: "bg-emerald-500/10",
  },
  decision: {
    label: "Decision",
    icon: "CheckCircle2",
    color: "#818cf8",
    badgeBg: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    glowClass: "glow-indigo",
    borderClass: "border-indigo-500/40 hover:border-indigo-500/70",
    accentBg: "bg-indigo-500/10",
  },
  question: {
    label: "Question",
    icon: "HelpCircle",
    color: "#c084fc",
    badgeBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    glowClass: "glow-purple",
    borderClass: "border-purple-500/40 hover:border-purple-500/70",
    accentBg: "bg-purple-500/10",
  },
  risk: {
    label: "Risk",
    icon: "AlertTriangle",
    color: "#f43f5e",
    badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    glowClass: "glow-rose",
    borderClass: "border-rose-500/40 hover:border-rose-500/70",
    accentBg: "bg-rose-500/10",
  },
  person: {
    label: "Person",
    icon: "User",
    color: "#94a3b8",
    badgeBg: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    glowClass: "",
    borderClass: "border-slate-600/50 hover:border-slate-500/70",
    accentBg: "bg-slate-500/10",
  },
  image: {
    label: "Visual",
    icon: "Image",
    color: "#ec4899",
    badgeBg: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    glowClass: "",
    borderClass: "border-pink-500/40 hover:border-pink-500/70",
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



