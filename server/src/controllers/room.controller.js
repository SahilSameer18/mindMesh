import { sendSuccess, sendError } from "../utils/response.js";
import * as roomService from "../services/room.service.js";
import { getCurrentUser } from "../middlewares/auth.middleware.js";
import prisma from "../lib/prisma.js";

export async function createRoom(req, res, next) {
  try {
    const { roomId, name, mode, systemContext } = req.body || {};
    const user = getCurrentUser(req);
    const rawId = roomId || name || `workspace-${Date.now().toString(36)}`;
    const finalRoomId = rawId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-") || `workspace-${Date.now()}`;
    const room = await roomService.getOrCreateRoom(finalRoomId, {
      name: name || `Room ${finalRoomId}`,
      mode: mode || "operational",
      systemContext: systemContext || null,
      userId: user && !user.isDemo ? user.id : null,
    });
    return sendSuccess(res, "Room created successfully", room, 201);
  } catch (err) {
    next(err);
  }
}

export async function getOrCreateRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const { name, mode, systemContext } = req.body || {};
    const room = await roomService.getOrCreateRoom(roomId, { name, mode, systemContext });
    return sendSuccess(res, "Room retrieved successfully", room);
  } catch (err) {
    next(err);
  }
}

export async function getRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const room = await roomService.getRoom(roomId);
    if (!room) {
      return sendError(res, "Room not found", ["Room does not exist"], 404);
    }
    return sendSuccess(res, "Room retrieved", room);
  } catch (err) {
    next(err);
  }
}

export async function updateRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const updated = await roomService.updateRoom(roomId, req.body);
    return sendSuccess(res, "Room updated successfully", updated);
  } catch (err) {
    next(err);
  }
}

export async function addContextZone(req, res, next) {
  try {
    const { roomId } = req.params;
    const { name, x, y, zoom } = req.body || {};
    if (!name || x === undefined || y === undefined) {
      return sendError(res, "Missing zone properties", ["name, x, and y are required"], 400);
    }
    const zone = await roomService.addContextZone(roomId, { name, x: Number(x), y: Number(y), zoom: zoom ? Number(zoom) : 1.0 });
    return sendSuccess(res, "Context zone added", zone, 201);
  } catch (err) {
    next(err);
  }
}

export async function getContextZones(req, res, next) {
  try {
    const { roomId } = req.params;
    const zones = await roomService.getContextZones(roomId);
    return sendSuccess(res, "Context zones retrieved", zones);
  } catch (err) {
    next(err);
  }
}

export async function deleteContextZone(req, res, next) {
  try {
    const { roomId, zoneId } = req.params;
    const deleted = await roomService.deleteContextZone(roomId, zoneId);
    if (!deleted) {
      return sendError(
        res,
        "Context zone not found",
        ["Context zone does not exist or does not belong to this room"],
        404
      );
    }
    return sendSuccess(res, "Context zone deleted", { zoneId });
  } catch (err) {
    next(err);
  }
}

export async function updateRoomMode(req, res, next) {
  try {
    const { roomId } = req.params;
    const { mode, systemContext } = req.body || {};

    const VALID_MODES = ["operational", "brainstorm", "solo"];
    if (mode && !VALID_MODES.includes(mode)) {
      return sendError(
        res,
        "Invalid room mode",
        [`Mode must be one of: ${VALID_MODES.join(", ")}`],
        400
      );
    }

    const updated = await roomService.updateRoomMode(roomId, { mode, systemContext });
    return sendSuccess(res, "Room mode updated successfully", updated);
  } catch (err) {
    next(err);
  }
}

export async function listRooms(req, res, next) {
  try {
    const user = getCurrentUser(req);
    const userId = user && !user.isDemo ? user.id : null;
    const rooms = await roomService.listRooms(userId);
    return sendSuccess(res, "Rooms retrieved successfully", rooms);
  } catch (err) {
    next(err);
  }
}

export async function deleteRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const user = req.user || getCurrentUser(req);

    if (!user || user.isGuest) {
      return sendError(res, "Forbidden", ["Guests cannot delete workspaces"], 403);
    }

    // In authenticated production mode, verify owner role in RoomMember
    if (!user.isDemo) {
      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: user.id,
          },
        },
      });

      if (membership) {
        if (membership.role !== "owner") {
          return sendError(res, "Forbidden", ["Only the workspace owner can delete this room"], 403);
        }
      } else {
        // Check if any owner exists for this room
        const anyOwner = await prisma.roomMember.findFirst({
          where: { roomId, role: "owner" },
        });
        if (anyOwner) {
          return sendError(res, "Forbidden", ["Only the workspace owner can delete this room"], 403);
        }
        // If legacy test room has no owner row at all, allow creator/caller cleanup
      }
    }

    await roomService.deleteRoom(roomId);
    return sendSuccess(res, "Room deleted successfully", { roomId });
  } catch (err) {
    next(err);
  }
}