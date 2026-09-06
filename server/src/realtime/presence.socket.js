import * as presenceService from "../services/presence.service.js";

/**
 * Registers real-time presence, cursor, viewport, and presenter socket handlers
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export function setupPresenceSocketHandlers(io, socket) {
  /**
   * Client transmits throttled canvas-coordinate cursor position
   */
  socket.on("cursor:move", ({ x, y, user }) => {
    const roomId = socket.roomId || socket.data?.roomId;
    if (!roomId) return;

    const senderUser = user || socket.user || socket.data?.user;

    socket.to(roomId).emit("cursor:moved", {
      socketId: socket.id,
      user: senderUser,
      x,
      y,
      timestamp: Date.now(),
    });
  });

  /**
   * Client transmits its camera viewport rectangle for peer radar minimaps
   */
  socket.on("presence:viewport", ({ viewport }) => {
    const roomId = socket.roomId || socket.data?.roomId;
    if (!roomId || !viewport) return;

    presenceService.updatePeerViewport(roomId, socket.id, viewport);

    socket.to(roomId).emit("presence:viewport-updated", {
      socketId: socket.id,
      user: socket.user || socket.data?.user,
      viewport,
    });
  });

  /**
   * Client requests to become the designated presenter ("Follow Me")
   */
  socket.on("presenter:start", (data, callback) => {
    const cb = typeof data === "function" ? data : callback;
    const roomId = socket.roomId || socket.data?.roomId;

    if (!roomId) {
      if (typeof cb === "function") cb({ success: false, error: "Not joined to a room" });
      return;
    }

    const user = socket.user || socket.data?.user;
    const result = presenceService.claimPresenter(roomId, socket.id, user);

    if (result.success) {
      // Broadcast to all participants in the room that this user started presenting
      io.to(roomId).emit("presenter:started", {
        socketId: socket.id,
        presenterId: socket.id,
        user: result.presenter.user,
        startedAt: result.presenter.startedAt,
      });

      if (typeof cb === "function") {
        cb({ success: true, presenter: result.presenter });
      }
    } else {
      if (typeof cb === "function") {
        cb({
          success: false,
          code: result.code,
          message: result.message,
          currentPresenter: result.currentPresenter,
        });
      }
    }
  });

  /**
   * Active presenter streams camera coordinate movements to followers
   * Enforces a defensive 30ms rate ceiling (~33 Hz) while ensuring the final resting coordinate
   * is always flushed via a trailing edge timer.
   */
  socket.on("presenter:sync", ({ x, y, zoom }) => {
    const roomId = socket.roomId || socket.data?.roomId;
    if (!roomId) return;

    const activePresenter = presenceService.getActivePresenter(roomId);
    if (!activePresenter || activePresenter.socketId !== socket.id) {
      // Only the authenticated lock holder can broadcast camera updates
      return;
    }

    const now = Date.now();
    presenceService.updatePresenterSyncState(roomId, socket.id, {
      latestCoords: { x, y, zoom },
    });

    if (activePresenter.lastSyncAt && now - activePresenter.lastSyncAt < 30) {
      // Cooldown active: ensure trailing edge flush delivers final resting coordinate
      if (!activePresenter.trailingTimer) {
        const remainingDelay = 30 - (now - activePresenter.lastSyncAt);
        const timer = setTimeout(() => {
          const current = presenceService.getActivePresenter(roomId);
          if (current && current.socketId === socket.id && current.latestCoords) {
            presenceService.updatePresenterSyncState(roomId, socket.id, {
              trailingTimer: null,
              lastSyncAt: Date.now(),
            });
            socket.to(roomId).emit("presenter:synced", {
              ...current.latestCoords,
              timestamp: Date.now(),
            });
          }
        }, remainingDelay);

        presenceService.updatePresenterSyncState(roomId, socket.id, {
          trailingTimer: timer,
        });
      }
      return;
    }

    // Clear any pending trailing timer since we are emitting immediately
    if (activePresenter.trailingTimer) {
      clearTimeout(activePresenter.trailingTimer);
      presenceService.updatePresenterSyncState(roomId, socket.id, {
        trailingTimer: null,
      });
    }

    presenceService.updatePresenterSyncState(roomId, socket.id, {
      lastSyncAt: now,
    });

    socket.to(roomId).emit("presenter:synced", {
      x,
      y,
      zoom,
      timestamp: now,
    });
  });

  /**
   * Active presenter stops presenting
   */
  socket.on("presenter:stop", (data, callback) => {
    const cb = typeof data === "function" ? data : callback;
    const roomId = socket.roomId || socket.data?.roomId;

    if (!roomId) {
      if (typeof cb === "function") cb({ success: false, error: "Not joined to a room" });
      return;
    }

    const result = presenceService.releasePresenter(roomId, socket.id);

    if (result.released) {
      io.to(roomId).emit("presenter:stopped", {
        socketId: socket.id,
        presenterId: socket.id,
        user: socket.user || socket.data?.user,
        reason: "stopped",
      });

      if (typeof cb === "function") {
        cb({ success: true });
      }
    } else {
      if (typeof cb === "function") {
        cb({ success: false, reason: result.reason });
      }
    }
  });

  /**
   * Client fetches current presence state and active presenter
   */
  socket.on("presence:sync", (data, callback) => {
    const cb = typeof data === "function" ? data : callback;
    const roomId = socket.roomId || socket.data?.roomId;

    if (!roomId) {
      if (typeof cb === "function") cb({ success: false, error: "Not joined to a room" });
      return;
    }

    const peers = presenceService.getPeers(roomId);
    const activePresenter = presenceService.getActivePresenter(roomId);

    if (typeof cb === "function") {
      cb({
        success: true,
        peers,
        activePresenter,
      });
    }
  });
}
