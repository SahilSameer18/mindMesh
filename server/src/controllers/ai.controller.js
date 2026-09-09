import {
  getRoomAIActions,
  approveAIAction as approveActionService,
  rejectAIAction as rejectActionService,
} from "../ai/applyAIActions.js";
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


