import * as guestService from "../services/guest.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Create a new invite link for a room (authenticated members only)
 */
export async function createInvite(req, res, next) {
  try {
    const { roomId } = req.params;
    const role = req.body?.role || "member";
    const invite = await guestService.createInviteLink(roomId, req.user.id, role);

    return sendSuccess(res, "Invite link created successfully", {
      ...invite,
      url: `/join/${invite.token}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resolve invite link metadata (public)
 */
export async function resolveInvite(req, res) {
  try {
    const invite = await guestService.resolveInviteLink(req.params.token);
    if (!invite) {
      return sendError(res, "Invite link invalid or expired", ["Invite link invalid or expired"], 404);
    }

    return sendSuccess(res, "Invite link resolved", {
      roomId: invite.roomId,
      roomName: invite.room?.name,
    });
  } catch (err) {
    return sendError(res, "Failed to resolve invite link", [err.message], 500);
  }
}

/**
 * Join room as a guest using an invite token (public)
 */
export async function joinAsGuest(req, res) {
  try {
    const { name } = req.body || {};
    if (!name?.trim()) {
      return sendError(res, "Validation error", ["Name is required to join as guest"], 400);
    }

    const invite = await guestService.resolveInviteLink(req.params.token);
    if (!invite) {
      return sendError(res, "Invite link expired or invalid", ["Invite link expired or invalid"], 404);
    }

    guestService.issueGuestSession(res, invite.roomId, name.trim());
    return sendSuccess(res, "Joined room as guest", {
      roomId: invite.roomId,
      name: name.trim(),
    });
  } catch (err) {
    return sendError(res, "Failed to join room as guest", [err.message], 500);
  }
}