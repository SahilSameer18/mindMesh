import { ACTION_TYPES, NODE_TYPES, EDGE_TYPES } from "./canvasActions.js";

const VALID_NODE_TYPES = new Set(Object.values(NODE_TYPES));
const VALID_EDGE_TYPES = new Set(Object.values(EDGE_TYPES));
const VALID_ACTION_TYPES = new Set(Object.values(ACTION_TYPES));

/**
 * Validates a canvas action payload before updating in-memory state or database.
 * @param {object} action - The canvas action { type, roomId, payload, timestamp }
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateCanvasAction(action) {
  if (!action || typeof action !== "object") {
    return { valid: false, error: "Action must be a valid object" };
  }

  const { type, roomId, payload } = action;

  if (!type || !VALID_ACTION_TYPES.has(type)) {
    return { valid: false, error: `Invalid or unsupported action type: ${type}` };
  }

  if (!roomId || typeof roomId !== "string") {
    return { valid: false, error: "Action missing valid roomId" };
  }

  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Action missing valid payload object" };
  }

  switch (type) {
    case ACTION_TYPES.CREATE_NODE: {
      if (!payload.id || typeof payload.id !== "string") {
        return { valid: false, error: "CREATE_NODE requires string id" };
      }
      if (payload.type && !VALID_NODE_TYPES.has(payload.type)) {
        return { valid: false, error: `CREATE_NODE has invalid node type: ${payload.type}` };
      }
      if (payload.x !== undefined && typeof payload.x !== "number") {
        return { valid: false, error: "CREATE_NODE x must be a number" };
      }
      if (payload.y !== undefined && typeof payload.y !== "number") {
        return { valid: false, error: "CREATE_NODE y must be a number" };
      }
      return { valid: true, error: null };
    }

    case ACTION_TYPES.UPDATE_NODE: {
      if (!payload.id || typeof payload.id !== "string") {
        return { valid: false, error: "UPDATE_NODE requires string id" };
      }
      if (payload.type && !VALID_NODE_TYPES.has(payload.type)) {
        return { valid: false, error: `UPDATE_NODE has invalid node type: ${payload.type}` };
      }
      if (payload.x !== undefined && typeof payload.x !== "number") {
        return { valid: false, error: "UPDATE_NODE x must be a number" };
      }
      if (payload.y !== undefined && typeof payload.y !== "number") {
        return { valid: false, error: "UPDATE_NODE y must be a number" };
      }
      return { valid: true, error: null };
    }

    case ACTION_TYPES.MOVE_NODE: {
      if (!payload.id || typeof payload.id !== "string") {
        return { valid: false, error: "MOVE_NODE requires string id" };
      }
      if (typeof payload.x !== "number" || typeof payload.y !== "number") {
        return { valid: false, error: "MOVE_NODE requires numeric x and y coordinates" };
      }
      return { valid: true, error: null };
    }

    case ACTION_TYPES.DELETE_NODE: {
      if (!payload.id || typeof payload.id !== "string") {
        return { valid: false, error: "DELETE_NODE requires string id" };
      }
      return { valid: true, error: null };
    }

    case ACTION_TYPES.CREATE_EDGE: {
      if (!payload.id || typeof payload.id !== "string") {
        return { valid: false, error: "CREATE_EDGE requires string id" };
      }
      if (!payload.fromId || typeof payload.fromId !== "string") {
        return { valid: false, error: "CREATE_EDGE requires string fromId" };
      }
      if (!payload.toId || typeof payload.toId !== "string") {
        return { valid: false, error: "CREATE_EDGE requires string toId" };
      }
      if (payload.fromId === payload.toId) {
        return { valid: false, error: "CREATE_EDGE fromId and toId cannot be identical" };
      }
      if (payload.type && !VALID_EDGE_TYPES.has(payload.type)) {
        return { valid: false, error: `CREATE_EDGE has invalid edge type: ${payload.type}` };
      }
      return { valid: true, error: null };
    }

    case ACTION_TYPES.DELETE_EDGE: {
      if (!payload.id || typeof payload.id !== "string") {
        return { valid: false, error: "DELETE_EDGE requires string id" };
      }
      return { valid: true, error: null };
    }

    default:
      return { valid: false, error: `Unhandled action type: ${type}` };
  }
}
