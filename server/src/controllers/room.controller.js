import { sendSuccess, sendError } from "../utils/response.js";
import * as roomService from "../services/room.service.js";

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
    const zone = await roomService.addContextZone(roomId, req.body);
    return sendSuccess(res, "Context zone added", zone, 201);
  } catch (err) {
    next(err);
  }
}
