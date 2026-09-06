import crypto from "crypto";

export const VALID_ACTION_TYPES = [
  "CREATE_NODE",
  "UPDATE_NODE",
  "DELETE_NODE",
  "CREATE_EDGE",
  "DELETE_EDGE",
  "MOVE_NODE",
  "REORGANIZE_LAYOUT",
  "ANSWER_QUERY",
];

export const VALID_NODE_TYPES = [
  "goal",
  "idea",
  "task",
  "decision",
  "question",
  "risk",
  "person",
  "image",
];

export const VALID_EDGE_TYPES = [
  "blocks",
  "depends_on",
  "leads_to",
  "supports",
  "contradicts",
  "related_to",
  "assigned_to",
  "part_of",
];

/**
 * Route action based on type and confidence tier:
 * - Destructive actions are NEVER auto-applied
 * - >= 0.85 -> "auto" (direct apply to canvas)
 * - 0.50 to 0.84 -> "proposed" (surfaced in Activity Stream for user review)
 * - < 0.50 -> "clarify" (Echo asks for clarification)
 */
export function routeAction(action) {
  if (["DELETE_NODE", "DELETE_EDGE"].includes(action.type)) {
    return "proposed";
  }
  if (action.type === "ANSWER_QUERY") {
    return "auto"; // read-only semantic query is always safe to auto-run
  }
  const confidence = Number(action.confidence ?? 0.8);
  if (confidence >= 0.85) return "auto";
  if (confidence >= 0.5) return "proposed";
  return "clarify";
}

/**
 * Helper to slugify text into a stable semanticKey
 */
export function slugifyText(text) {
  if (!text || typeof text !== "string") return "concept_" + Math.random().toString(36).slice(2, 8);
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Validate and sanitize a single raw AIAction
 */
export function validateAIAction(raw) {
  if (!raw || typeof raw !== "object") return null;

  const type = String(raw.type || "").trim().toUpperCase();
  if (!VALID_ACTION_TYPES.includes(type)) return null;

  const payload = raw.payload && typeof raw.payload === "object" ? { ...raw.payload } : {};
  const confidence = Math.max(0, Math.min(1, Number(raw.confidence ?? 0.85)));
  const reason = String(raw.reason || "").trim() || "Detected by AI";

  if (type === "CREATE_NODE") {
    if (!payload.text || typeof payload.text !== "string" || !payload.text.trim()) {
      return null;
    }
    payload.text = payload.text.trim();
    payload.type = VALID_NODE_TYPES.includes(payload.type?.toLowerCase())
      ? payload.type.toLowerCase()
      : "idea";

    payload.semanticKey = payload.semanticKey
      ? slugifyText(payload.semanticKey)
      : slugifyText(payload.text);

    // Ensure stable string ID for CanvasDocument validation
    payload.id =
      payload.id && typeof payload.id === "string"
        ? payload.id
        : payload.semanticKey
        ? `node-${payload.semanticKey}`
        : crypto.randomUUID();

    payload.x = typeof payload.x === "number" ? payload.x : 0;
    payload.y = typeof payload.y === "number" ? payload.y : 0;

    if (!payload.metadata || typeof payload.metadata !== "object") {
      payload.metadata = {};
    }
  } else if (type === "UPDATE_NODE") {
    if (!payload.semanticKey && !payload.id) {
      return null;
    }
    if (payload.semanticKey) {
      payload.semanticKey = slugifyText(payload.semanticKey);
    }
    if (payload.type && !VALID_NODE_TYPES.includes(payload.type.toLowerCase())) {
      delete payload.type;
    }
  } else if (type === "CREATE_EDGE") {
    const hasFrom = payload.fromSemanticKey || payload.fromId;
    const hasTo = payload.toSemanticKey || payload.toId;
    if (!hasFrom || !hasTo) return null;

    payload.id = payload.id && typeof payload.id === "string"
      ? payload.id
      : crypto.randomUUID();

    payload.type = VALID_EDGE_TYPES.includes(payload.type?.toLowerCase())
      ? payload.type.toLowerCase()
      : "related_to";
    payload.label = payload.label || payload.type;
  }

  const action = {
    type,
    payload,
    confidence,
    reason,
  };

  action.status = routeAction(action);
  return action;
}

/**
 * Validates and routes an entire batch of actions
 */
export function processAIActions(rawActions = []) {
  if (!Array.isArray(rawActions)) return [];
  return rawActions
    .map(validateAIAction)
    .filter(Boolean);
}