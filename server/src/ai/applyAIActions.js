/**
 * mindMesh — AI Action Effector & Activity Stream Persistence Service
 * Bridges AI outputs to CanvasDocument and Neon PostgreSQL persistence.
 * Enforces idempotency via SHA-256 fingerprinting and routes "auto" vs "proposed" actions.
 */

import prisma from "../lib/prisma.js";
import { getCanvasDocument } from "../canvas/canvasDocument.js";
import { getIO } from "../realtime/socket.js";
import { computeFingerprint } from "../utils/hash.js";
import { routeAction } from "./validation.js";

function resolveSocketIO(customIO) {
  if (customIO) return customIO;
  try {
    return getIO();
  } catch {
    return null;
  }
}

/**
 * Persists, deduplicates, and routes a list of validated AI actions
 * @param {string} roomId
 * @param {Array<object>} actions
 * @param {object} options
 * @returns {Promise<Array<object>>} Applied/persisted AIAction rows
 */
export async function applyAIActions(roomId, actions = [], { sourceId = null, io = null } = {}) {
  if (!roomId || typeof roomId !== "string") {
    throw new Error("[applyAIActions] roomId is required");
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    return [];
  }

  const socketIO = resolveSocketIO(io);
  const results = [];

  for (const action of actions) {
    if (!action || !action.type) continue;

    const payload = action.payload || {};
    const fingerprint = computeFingerprint(roomId, sourceId, action.type, payload);

    // 1. Idempotency check: drop if this exact action was already recorded
    const existing = await prisma.aIAction.findUnique({
      where: { fingerprint },
    });

    if (existing) {
      results.push(existing);
      continue;
    }

    const initialStatus = action.status || action.route || routeAction(action);

    // 2. Persist AIAction row in Neon PostgreSQL
    const record = await prisma.aIAction.create({
      data: {
        roomId,
        type: action.type,
        payload,
        confidence: action.confidence !== undefined ? Number(action.confidence) : null,
        reason: action.reason || null,
        status: initialStatus,
        fingerprint,
      },
    });

    // 3. Status Routing
    if (initialStatus === "auto") {
      // Execute mutating actions against authoritative CanvasDocument
      if (action.type !== "ANSWER_QUERY") {
        const doc = await getCanvasDocument(roomId);
        await doc.applyAction({
          type: action.type,
          roomId,
          payload,
        });
      }

      // Update row status to "applied"
      const appliedRecord = await prisma.aIAction.update({
        where: { id: record.id },
        data: { status: "applied" },
      });

      // Broadcast to room participants via Socket.io
      if (socketIO) {
        if (action.type !== "ANSWER_QUERY") {
          socketIO.to(roomId).emit("canvas:action", {
            type: action.type,
            roomId,
            payload,
          });
        }
        socketIO.to(roomId).emit("ai:activity", appliedRecord);
      }

      results.push(appliedRecord);
    } else {
      // Proposed or clarify: notify clients with specific routing tier
      const eventName = initialStatus === "clarify" ? "ai:clarify" : "ai:proposed";
      if (socketIO) {
        socketIO.to(roomId).emit(eventName, record);
      }
      results.push(record);
    }
  }

  return results;
}

/**
 * Approve a proposed AI action: applies to CanvasDocument and marks as applied
 */
export async function approveAIAction(roomId, actionId, { io = null } = {}) {
  const action = await prisma.aIAction.findFirst({
    where: { id: actionId, roomId },
  });

  if (!action) {
    throw new Error(`[applyAIActions] Action not found: ${actionId}`);
  }

  if (action.status === "applied") {
    return action;
  }

  const socketIO = resolveSocketIO(io);

  // Apply to authoritative CanvasDocument
  if (action.type !== "ANSWER_QUERY") {
    const doc = await getCanvasDocument(roomId);
    await doc.applyAction({
      type: action.type,
      roomId,
      payload: action.payload,
    });
  }

  // Update DB status to applied
  const updated = await prisma.aIAction.update({
    where: { id: actionId },
    data: { status: "applied" },
  });

  // Broadcast to room
  if (socketIO) {
    if (action.type !== "ANSWER_QUERY") {
      socketIO.to(roomId).emit("canvas:action", {
        type: action.type,
        roomId,
        payload: action.payload,
      });
    }
    socketIO.to(roomId).emit("ai:activity", updated);
  }

  return updated;
}

/**
 * Dismiss/reject a proposed AI action
 */
export async function rejectAIAction(roomId, actionId, { io = null } = {}) {
  const action = await prisma.aIAction.findFirst({
    where: { id: actionId, roomId },
  });

  if (!action) {
    throw new Error(`[applyAIActions] Action not found: ${actionId}`);
  }

  const updated = await prisma.aIAction.update({
    where: { id: actionId },
    data: { status: "rejected" },
  });

  const socketIO = resolveSocketIO(io);
  if (socketIO) {
    socketIO.to(roomId).emit("ai:activity:updated", updated);
  }

  return updated;
}

/**
 * Fetch recent AI actions for room history hydration (Activity Stream)
 */
export async function getRoomAIActions(roomId, { limit = 50, status = null } = {}) {
  const where = { roomId };
  if (status) {
    where.status = status;
  }

  return await prisma.aIAction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(100, Math.max(1, Number(limit) || 50)),
  });
}