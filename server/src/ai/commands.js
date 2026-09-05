/**
 * mindMesh — Active Command Bar Execution Engine
 * Interprets natural language commands against active canvas state,
 * coordinates spatial layout engine, queries semantic nodes, and
 * pipes all actions through the authoritative applyAIActions effector.
 */

import { withFallback } from "./providers/index.js";
import { processAIActions } from "./validation.js";
import { deduplicateAndLinkActions } from "../canvas/canvasDeduplication.js";
import { computeLayout, createMoveActionsFromLayout } from "../canvas/canvasLayout.js";
import { applyAIActions } from "./applyAIActions.js";
import { getCanvasDocument } from "../canvas/canvasDocument.js";

/**
 * Execute a workspace command or semantic query against a canvas room
 * @param {object} params
 * @param {string} params.roomId
 * @param {string} params.prompt - Natural language command (e.g. "Turn this into a roadmap")
 * @param {object} [params.canvasDoc] - Optional preloaded CanvasDocument
 * @param {string} [params.userId] - Requesting user ID
 * @param {Array<object>} [params.participants] - Active room participants
 * @param {string} [params.workspaceContext] - Additional room context
 * @param {object} [params.io] - Socket.io server instance for live broadcasts
 * @returns {Promise<object>} Command execution result
 */
export async function executeWorkspaceCommand({
  roomId,
  prompt,
  canvasDoc = null,
  userId = null,
  participants = [],
  workspaceContext = "",
  io = null,
} = {}) {
  if (!roomId || typeof roomId !== "string") {
    throw new Error("[executeWorkspaceCommand] roomId is required");
  }

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return {
      intent: "ANSWER_QUERY",
      summary: "Empty command prompt received.",
      answer: "Please provide a command or question for the workspace.",
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      actions: [],
      status: "idle",
    };
  }

  // 1. Fetch authoritative active canvas state
  const doc = canvasDoc || (await getCanvasDocument(roomId));
  const state = doc.getState();
  const nodes = state.nodes || [];
  const edges = state.edges || [];

  // 2. Query AI model with fallback
  const rawResult = await withFallback("executeCanvasCommand", {
    prompt: prompt.trim(),
    nodes,
    edges,
    participants,
    workspaceContext,
  });

  if (rawResult.status === "failed") {
    return rawResult;
  }

  const intent = rawResult.intent || "ANSWER_QUERY";
  let targetActions = [];

  // 3. Process Intent & Calculate Changes
  if (intent === "REORGANIZE_LAYOUT" || rawResult.layoutType) {
    const layoutType = rawResult.layoutType || "grid";
    const moves = computeLayout(layoutType, nodes, edges);
    const moveActions = createMoveActionsFromLayout(roomId, moves);
    targetActions = [...moveActions];
  } else if (intent === "ANSWER_QUERY") {
    // Construct read-only answer record
    targetActions = [
      {
        type: "ANSWER_QUERY",
        roomId,
        payload: {
          query: prompt.trim(),
          answer: rawResult.answer || rawResult.summary,
          highlightedNodeIds: rawResult.highlightedNodeIds || [],
          highlightedEdgeIds: rawResult.highlightedEdgeIds || [],
        },
        confidence: 1.0,
        reason: rawResult.summary || "Answer to user question",
      },
    ];
  }

  // Complementary actions proposed by AI (e.g. new nodes or edits)
  if (Array.isArray(rawResult.actions) && rawResult.actions.length > 0) {
    const validated = processAIActions(rawResult.actions);
    const deduplicated = deduplicateAndLinkActions(validated, nodes, edges);
    targetActions.push(...deduplicated);
  }

  // 4. Pipe actions through the authoritative persistence & broadcast effector
  const commandSourceId = `cmd:${Date.now()}:${(userId || "user").slice(0, 8)}`;
  const appliedActions = await applyAIActions(roomId, targetActions, {
    sourceId: commandSourceId,
    io,
  });

  return {
    intent,
    summary: rawResult.summary,
    answer: rawResult.answer,
    highlightedNodeIds: rawResult.highlightedNodeIds || [],
    highlightedEdgeIds: rawResult.highlightedEdgeIds || [],
    layoutType: rawResult.layoutType,
    actions: appliedActions,
    status: "success",
    provider: rawResult.provider,
    model: rawResult.model,
  };
}
