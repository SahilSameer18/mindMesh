import * as guestService from "../services/guest.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import prisma from "../lib/prisma.js";
import { getCurrentUser } from "../middlewares/auth.middleware.js";

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
 * Join room using an invite token (supports authenticated users and guests)
 */
export async function joinAsGuest(req, res) {
  try {
    const { name } = req.body || {};
    const invite = await guestService.resolveInviteLink(req.params.token);
    if (!invite) {
      return sendError(res, "Invite link expired or invalid", ["Invite link expired or invalid"], 404);
    }

    const user = getCurrentUser(req);
    if (user && !user.isDemo) {
      // Authenticated user joining via invite link - register as RoomMember
      try {
        await prisma.roomMember.upsert({
          where: {
            roomId_userId: {
              roomId: invite.roomId,
              userId: user.id,
            },
          },
          create: {
            roomId: invite.roomId,
            userId: user.id,
            role: invite.role || "member",
          },
          update: {},
        });
      } catch (memberErr) {
        console.warn("[joinAsGuest] Membership upsert note:", memberErr.message);
      }

      return sendSuccess(res, "Joined room successfully", {
        roomId: invite.roomId,
        name: user.name,
        isGuest: false,
      });
    }

    if (!name?.trim()) {
      return sendError(res, "Validation error", ["Name is required to join as guest"], 400);
    }

    guestService.issueGuestSession(res, invite.roomId, name.trim());
    return sendSuccess(res, "Joined room as guest", {
      roomId: invite.roomId,
      name: name.trim(),
      isGuest: true,
    });
  } catch (err) {
    return sendError(res, "Failed to join room as guest", [err.message], 500);
  }
}

