import {
  getRoomAIActions,
  approveAIAction as approveActionService,
  rejectAIAction as rejectActionService,
  applyAIActions,
} from "../ai/applyAIActions.js";
import { extractAgendaTopics } from "../ai/agenda.js";
import { getCanvasDocument } from "../canvas/canvasDocument.js";
import { findSimilarPillar } from "../canvas/canvasDeduplication.js";
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
 *
 * Known limitation: this isn't coordinated with extractionQueue's single-flight
 * lock for live dialogue extraction on the same room — both read/write the
 * canvas document independently. In practice agenda-paste happens once at the
 * start of a meeting, so the window for a genuine concurrent collision is
 * narrow; not worth cross-path locking unless this turns out to matter.
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

    const { topics: rawTopics = [] } = await extractAgendaTopics(agendaText.trim());

    if (!Array.isArray(rawTopics) || rawTopics.length === 0) {
      return sendError(res, "Could not extract topics from the provided agenda", ["No topics identified"], 422);
    }

    // Skip topics that already have a matching pillar on canvas (exact key or close
    // wording) — otherwise re-pasting the same/updated agenda duplicates every pillar.
    const doc = await getCanvasDocument(roomId);
    const existingPillars = (doc.getState().nodes || []).filter(
      (n) => n.metadata?.isAgendaTopic || (n.type === "goal" && typeof n.y === "number" && n.y <= -100)
    );
    const topics = rawTopics.filter((topic) => !findSimilarPillar(existingPillars, topic.title, topic.semanticKey));

    if (topics.length === 0) {
      return sendSuccess(res, "All proposed topics already exist on the canvas", { topics: [], actions: [] });
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



