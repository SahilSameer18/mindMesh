import {
  getRoomAIActions,
  approveAIAction as approveActionService,
  rejectAIAction as rejectActionService,
  applyAIActions,
} from "../ai/applyAIActions.js";
import { extractAgendaTopics } from "../ai/agenda.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * GET /api/rooms/:roomId/ai-actions
 * Fetch recent AI action history for the Activity Stream
 */
export async function getAIActions(req, res) {
  try {
    const { roomId } = req.params;
    const { limit, status } = req.query;

    const actions = await getRoomAIActions(roomId, {
      limit: Number(limit) || 50,
      status: status ? String(status) : null,
    });

    return sendSuccess(res, "AI actions retrieved successfully", actions);
  } catch (err) {
    console.error("[AIController] Error fetching actions:", err.message);
    return sendError(res, "Failed to fetch AI actions", [err.message], 500);
  }
}

/**
 * POST /api/rooms/:roomId/ai-actions/:actionId/approve
 * User clicks [Apply] on a proposed action card
 */
export async function approveAIAction(req, res) {
  try {
    const { roomId, actionId } = req.params;
    const action = await approveActionService(roomId, actionId);
    return sendSuccess(res, "AI action approved and applied to canvas", action);
  } catch (err) {
    console.error("[AIController] Error approving action:", err.message);
    const status = err.message.includes("not found") ? 404 : 500;
    return sendError(res, "Failed to approve AI action", [err.message], status);
  }
}

/**
 * POST /api/rooms/:roomId/ai-actions/:actionId/reject
 * User clicks [Dismiss] on a proposed action card
 */
export async function rejectAIAction(req, res) {
  try {
    const { roomId, actionId } = req.params;
    const action = await rejectActionService(roomId, actionId);
    return sendSuccess(res, "AI action dismissed", action);
  } catch (err) {
    console.error("[AIController] Error rejecting action:", err.message);
    const status = err.message.includes("not found") ? 404 : 500;
    return sendError(res, "Failed to reject AI action", [err.message], status);
  }
}

/**
 * POST /api/rooms/:roomId/agenda
 * Decomposes meeting agenda into strategic topic pillars, anchors them horizontally at y = -150,
 * and persists them as authoritative goal nodes.
 */
export async function generateAgenda(req, res) {
  try {
    const { roomId } = req.params;
    const { agendaText } = req.body || {};

    if (!agendaText || typeof agendaText !== "string" || agendaText.trim().length < 15) {
      return sendError(
        res,
        "Agenda text is too short to extract topics (minimum 15 characters required)",
        ["Validation failed"],
        422
      );
    }

    const { topics = [] } = await extractAgendaTopics(agendaText.trim());

    if (!Array.isArray(topics) || topics.length === 0) {
      return sendError(res, "Could not extract topics from the provided agenda", ["No topics identified"], 422);
    }

    const total = topics.length;
    const actions = topics.map((topic, index) => {
      const x = Math.round((index - (total - 1) / 2) * 340);
      const y = -150;
      const semanticKey = topic.semanticKey || `agenda_topic_${index + 1}`;
      const nodeId = `node-agenda-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;

      return {
        type: "CREATE_NODE",
        confidence: 0.98,
        reason: `Agenda Topic Anchor: ${topic.title}`,
        status: "auto",
        payload: {
          id: nodeId,
          text: topic.title,
          type: "goal",
          semanticKey,
          x,
          y,
          metadata: {
            isAgendaTopic: true,
            semanticKey,
            description: topic.description || "",
            status: "active",
            priority: "high",
          },
        },
      };
    });

    const appliedActions = await applyAIActions(roomId, actions, { sourceId: `agenda-${Date.now()}` });

    return sendSuccess(res, "Agenda topics successfully anchored to canvas", {
      topics,
      actions: appliedActions,
    });
  } catch (err) {
    console.error("[AIController] Error generating agenda topics:", err.message);
    return sendError(res, "Failed to generate agenda topics", [err.message], 500);
  }
}



