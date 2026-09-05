import { getCanvasDocument } from "../canvas/canvasDocument.js";
import { executeWorkspaceCommand } from "../ai/commands.js";
import { approveAIAction, rejectAIAction } from "../ai/applyAIActions.js";

/**
 * Initializes real-time canvas socket event handlers for a connected client
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export function initCanvasSocket(io, socket) {
  /**
   * Client joins a canvas room:
   * 1. Joins Socket.io room and sets authoritative socket.roomId
   * 2. Loads and sends authoritative canvas state (canvas:init)
   * 3. Broadcasts presence to peers (presence:peer-joined)
   */
  socket.on("canvas:join", async ({ roomId, user }, callback) => {
    if (!roomId) {
      if (typeof callback === "function") callback({ success: false, error: "Missing roomId" });
      return;
    }

    try {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.user = user || { id: socket.id, name: "Collaborator" };

      const doc = await getCanvasDocument(roomId);
      const state = doc.getState();

      // Emit canvas state to joining client
      socket.emit("canvas:init", { roomId, state });

      // Notify other peers in room of presence
      socket.to(roomId).emit("presence:peer-joined", {
        user: socket.user,
        socketId: socket.id,
      });

      if (typeof callback === "function") {
        callback({ success: true, state });
      }
    } catch (err) {
      console.error(`[CanvasSocket] Error in canvas:join for room ${roomId}:`, err.message);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });

  /**
   * Client leaves the currently joined canvas room
   */
  socket.on("canvas:leave", () => {
    if (!socket.roomId) return;
    const roomId = socket.roomId;

    socket.leave(roomId);
    socket.to(roomId).emit("presence:peer-left", {
      socketId: socket.id,
      user: socket.user,
    });
    socket.roomId = null;
  });

  /**
   * Client dispatches a single atomic canvas action.
   * Strictly trusts socket.roomId from the join handshake, preventing room auth bypass.
   */
  socket.on("canvas:action", async ({ action }, callback) => {
    const targetRoomId = socket.roomId;
    if (!targetRoomId) {
      if (typeof callback === "function") callback({ success: false, error: "Not joined to a room" });
      return;
    }

    if (!action || typeof action !== "object") {
      if (typeof callback === "function") callback({ success: false, error: "Missing valid action object" });
      return;
    }

    try {
      // Overwrite action.roomId with the authoritative joined room
      action.roomId = targetRoomId;

      const doc = await getCanvasDocument(targetRoomId);
      await doc.applyAction(action);

      // Broadcast immediately to all other participants in the room
      socket.to(targetRoomId).emit("canvas:action", action);

      if (typeof callback === "function") {
        callback({ success: true, action });
      }
    } catch (err) {
      console.error(`[CanvasSocket] Error in canvas:action:`, err.message);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });

  /**
   * Client or AI dispatches a batch of canvas actions.
   * Strictly uses socket.roomId.
   */
  socket.on("canvas:batch_action", async ({ actions }, callback) => {
    const targetRoomId = socket.roomId;
    if (!targetRoomId) {
      if (typeof callback === "function") callback({ success: false, error: "Not joined to a room" });
      return;
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      if (typeof callback === "function") callback({ success: false, error: "Missing valid actions array" });
      return;
    }

    try {
      const doc = await getCanvasDocument(targetRoomId);
      const appliedActions = [];

      for (const action of actions) {
        action.roomId = targetRoomId;
        await doc.applyAction(action);
        appliedActions.push(action);
      }

      // Broadcast batch to peers
      socket.to(targetRoomId).emit("canvas:batch_action", { actions: appliedActions });

      if (typeof callback === "function") {
        callback({ success: true, count: appliedActions.length });
      }
    } catch (err) {
      console.error(`[CanvasSocket] Error in canvas:batch_action:`, err.message);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });

  /**
   * Real-time cursor movement relay.
   * Strictly uses socket.roomId.
   */
  socket.on("cursor:move", ({ x, y, user }) => {
    const targetRoomId = socket.roomId;
    if (!targetRoomId) return;

    socket.to(targetRoomId).emit("cursor:moved", {
      socketId: socket.id,
      user: user || socket.user,
      x,
      y,
      timestamp: Date.now(),
    });
  });

  /**
   * Client executes a natural language command via the Active Command Bar
   */
  socket.on("canvas:command", async ({ prompt, workspaceContext }, callback) => {
    const targetRoomId = socket.roomId;
    if (!targetRoomId) {
      if (typeof callback === "function") callback({ success: false, error: "Not joined to a room" });
      return;
    }

    try {
      // Dynamically query connected socket peers in this room for active participant roster
      const roomSockets = await io.in(targetRoomId).fetchSockets();
      const participants = roomSockets
        .map((s) => s.user)
        .filter(Boolean);

      const result = await executeWorkspaceCommand({
        roomId: targetRoomId,
        prompt,
        userId: socket.user?.id,
        participants,
        workspaceContext,
        io,
      });

      socket.emit("canvas:command:result", result);

      if (typeof callback === "function") {
        callback({ success: true, result });
      }
    } catch (err) {
      console.error(`[CanvasSocket] Error in canvas:command:`, err.message);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });

  /**
   * Client approves a proposed AI action from the Activity Stream
   */
  socket.on("ai:action:approve", async ({ actionId }, callback) => {
    const targetRoomId = socket.roomId;
    if (!targetRoomId) {
      if (typeof callback === "function") callback({ success: false, error: "Not joined to a room" });
      return;
    }

    try {
      const updated = await approveAIAction(targetRoomId, actionId, { io });
      if (typeof callback === "function") {
        callback({ success: true, action: updated });
      }
    } catch (err) {
      console.error(`[CanvasSocket] Error in ai:action:approve:`, err.message);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });

  /**
   * Client rejects a proposed AI action from the Activity Stream
   */
  socket.on("ai:action:reject", async ({ actionId }, callback) => {
    const targetRoomId = socket.roomId;
    if (!targetRoomId) {
      if (typeof callback === "function") callback({ success: false, error: "Not joined to a room" });
      return;
    }

    try {
      const updated = await rejectAIAction(targetRoomId, actionId, { io });
      if (typeof callback === "function") {
        callback({ success: true, action: updated });
      }
    } catch (err) {
      console.error(`[CanvasSocket] Error in ai:action:reject:`, err.message);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });
}

