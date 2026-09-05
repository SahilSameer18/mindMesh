import crypto from "crypto";

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

/**
 * Action Creators with deterministic ID generation
 * Ensures payload.id is always defined before reaching persistence
 */

export function createNodeAction(roomId, {
  id = crypto.randomUUID(),
  text = "",
  type = NODE_TYPES.IDEA,
  semanticKey = null,
  x = 0,
  y = 0,
  metadata = {},
  sourceType = "manual",
  sourceId = null,
} = {}) {
  return {
    type: ACTION_TYPES.CREATE_NODE,
    roomId,
    payload: {
      id,
      roomId,
      text,
      type,
      semanticKey,
      x: Number(x) || 0,
      y: Number(y) || 0,
      metadata,
      sourceType,
      sourceId,
    },
    timestamp: Date.now(),
  };
}

export function updateNodeAction(roomId, id, updates = {}) {
  const allowedKeys = ["text", "type", "semanticKey", "x", "y", "metadata"];
  const sanitizedUpdates = {};
  for (const key of allowedKeys) {
    if (updates[key] !== undefined) {
      sanitizedUpdates[key] = updates[key];
    }
  }

  return {
    type: ACTION_TYPES.UPDATE_NODE,
    roomId,
    payload: {
      id,
      roomId,
      ...sanitizedUpdates,
    },
    timestamp: Date.now(),
  };
}

export function moveNodeAction(roomId, id, { x, y }) {
  return {
    type: ACTION_TYPES.MOVE_NODE,
    roomId,
    payload: {
      id,
      roomId,
      x: Number(x) || 0,
      y: Number(y) || 0,
    },
    timestamp: Date.now(),
  };
}

export function deleteNodeAction(roomId, id) {
  return {
    type: ACTION_TYPES.DELETE_NODE,
    roomId,
    payload: {
      id,
      roomId,
    },
    timestamp: Date.now(),
  };
}

export function createEdgeAction(roomId, {
  id = crypto.randomUUID(),
  fromId,
  toId,
  label = null,
  type = EDGE_TYPES.RELATED_TO,
} = {}) {
  return {
    type: ACTION_TYPES.CREATE_EDGE,
    roomId,
    payload: {
      id,
      roomId,
      fromId,
      toId,
      label,
      type,
    },
    timestamp: Date.now(),
  };
}

export function deleteEdgeAction(roomId, id) {
  return {
    type: ACTION_TYPES.DELETE_EDGE,
    roomId,
    payload: {
      id,
      roomId,
    },
    timestamp: Date.now(),
  };
}
