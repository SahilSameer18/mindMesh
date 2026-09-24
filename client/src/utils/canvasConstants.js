export const DEFAULT_ROOM_ID = "demo-room";

const NODE_WIDTH = 256;
const DEFAULT_NODE_HEIGHT = 96;

// Shared by CanvasEdge (real edge anchors) and InfiniteCanvas (drag-connection
// preview line) so both agree on where a card's actual visual bounds are —
// image/long-text cards render taller than the 96px default.
export function getNodeDimensions(node) {
  if (!node) return { width: NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  const width = node.width || NODE_WIDTH;
  let height = node.height || DEFAULT_NODE_HEIGHT;
  if (node.type === "image") {
    height = 230;
  } else if (node.text && node.text.length > 90) {
    height = 130;
  }
  return { width, height };
}

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
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300 font-semibold",
    borderClass: "border-amber-300/80 hover:border-amber-500 shadow-card",
    accentBg: "bg-amber-500/10",
  },
  idea: {
    label: "Idea",
    icon: "Lightbulb",
    color: "#3B7A78",
    badgeBg: "bg-teal-100 text-teal-900 border-teal-300 font-semibold",
    borderClass: "border-teal-300/80 hover:border-teal-500 shadow-card",
    accentBg: "bg-teal-500/10",
  },
  task: {
    label: "Task",
    icon: "CheckSquare",
    color: "#059669",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold",
    borderClass: "border-emerald-300/80 hover:border-emerald-500 shadow-card",
    accentBg: "bg-emerald-500/10",
  },
  decision: {
    label: "Decision",
    icon: "CheckCircle2",
    color: "#A8542E",
    badgeBg: "bg-accent/10 text-accent border-accent/30 font-semibold",
    borderClass: "border-accent/40 hover:border-accent shadow-card",
    accentBg: "bg-accent/10",
  },
  question: {
    label: "Question",
    icon: "HelpCircle",
    color: "#8B5A7C",
    badgeBg: "bg-fuchsia-100/70 text-fuchsia-900 border-fuchsia-300/70 font-semibold",
    borderClass: "border-fuchsia-300/60 hover:border-fuchsia-500/70 shadow-card",
    accentBg: "bg-fuchsia-500/10",
  },
  risk: {
    label: "Risk",
    icon: "AlertTriangle",
    color: "#e11d48",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-300 font-semibold",
    borderClass: "border-rose-300/80 hover:border-rose-500 shadow-card",
    accentBg: "bg-rose-500/10",
  },
  person: {
    label: "Person",
    icon: "User",
    color: "#475569",
    badgeBg: "bg-slate-100 text-slate-900 border-slate-300 font-semibold",
    borderClass: "border-slate-300 hover:border-slate-400 shadow-card",
    accentBg: "bg-slate-500/10",
  },
  image: {
    label: "Visual",
    icon: "Image",
    color: "#B5626F",
    badgeBg: "bg-rose-100/60 text-rose-900 border-rose-300/60 font-semibold",
    borderClass: "border-rose-300/60 hover:border-rose-500/60 shadow-card",
    accentBg: "bg-rose-500/[0.08]",
  },
};

export const EDGE_CONFIGS = {
  blocks: { color: "#f43f5e", label: "blocks", strokeDasharray: "none", strokeWidth: 2.5 },
  depends_on: { color: "#f59e0b", label: "depends on", strokeDasharray: "6 4", strokeWidth: 2 },
  leads_to: { color: "#10b981", label: "leads to", strokeDasharray: "none", strokeWidth: 2 },
  supports: { color: "#3B7A78", label: "supports", strokeDasharray: "none", strokeWidth: 2 },
  contradicts: { color: "#f97316", label: "contradicts", strokeDasharray: "4 4", strokeWidth: 2 },
  related_to: { color: "#64748b", label: "relates to", strokeDasharray: "none", strokeWidth: 1.5 },
  assigned_to: { color: "#A8542E", label: "assigned to", strokeDasharray: "4 4", strokeWidth: 2 },
  part_of: { color: "#8B5A7C", label: "part of", strokeDasharray: "none", strokeWidth: 2 },
};



