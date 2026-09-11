/**
 * In-memory presence and presenter registry for mindMesh rooms.
 * Manages connected peers, viewports, and atomic single-presenter locks.
 */
import { closeCanvasDocument } from "../canvas/canvasDocument.js";

// roomId -> Map<socketId, { user, viewport, lastSeen }>
const roomPeers = new Map();

// roomId -> { socketId, user, startedAt }
const roomPresenters = new Map();

/**
 * Registers or updates a peer in the room presence registry
 * @param {string} roomId
 * @param {string} socketId
 * @param {object} user
 */
export function addPeer(roomId, socketId, user) {
  if (!roomId || !socketId) return [];

  if (!roomPeers.has(roomId)) {
    roomPeers.set(roomId, new Map());
  }

  const peers = roomPeers.get(roomId);
  peers.set(socketId, {
    socketId,
    user: user || { id: socketId, name: "Collaborator" },
    viewport: null,
    lastSeen: Date.now(),
  });

  return getPeers(roomId);
}

/**
 * Removes a peer from the room presence registry
 * @param {string} roomId
 * @param {string} socketId
 * @returns {Array} Updated list of peers remaining in the room
 */
export function removePeer(roomId, socketId) {
  if (!roomId || !socketId) return [];

  const peers = roomPeers.get(roomId);
  if (peers) {
    peers.delete(socketId);
    if (peers.size === 0) {
      roomPeers.delete(roomId);
    }
  }

  return getPeers(roomId);
}

/**
 * Gets all active peers in a room
 * @param {string} roomId
 * @returns {Array} Array of peer objects
 */
export function getPeers(roomId) {
  if (!roomId || !roomPeers.has(roomId)) return [];
  return Array.from(roomPeers.get(roomId).values());
}

/**
 * Updates a peer's current canvas viewport
 * @param {string} roomId
 * @param {string} socketId
 * @param {{ x: number, y: number, zoom: number, width: number, height: number }} viewport
 */
export function updatePeerViewport(roomId, socketId, viewport) {
  if (!roomId || !socketId) return;

  const peers = roomPeers.get(roomId);
  if (peers && peers.has(socketId)) {
    const peer = peers.get(socketId);
    peer.viewport = viewport;
    peer.lastSeen = Date.now();
  }
}

/**
 * Atomically attempts to claim the exclusive presenter lock for a room.
 * Rejects if a different socket already holds the lock.
 *
 * @param {string} roomId
 * @param {string} socketId
 * @param {object} user
 * @returns {{ success: boolean, code?: string, message?: string, presenter?: object, currentPresenter?: object }}
 */
export function claimPresenter(roomId, socketId, user) {
  if (!roomId || !socketId) {
    return { success: false, code: "INVALID_REQUEST", message: "Missing roomId or socketId" };
  }

  const existing = roomPresenters.get(roomId);

  // If already held by the same socket, idempotent success
  if (existing && existing.socketId === socketId) {
    return { success: true, presenter: existing, idempotent: true };
  }

  // If held by a different socket, reject strictly
  if (existing) {
    return {
      success: false,
      code: "PRESENTER_BUSY",
      message: `${existing.user?.name || "Another participant"} is currently presenting`,
      currentPresenter: existing,
    };
  }

  // Grant lock
  const presenter = {
    socketId,
    user: user || { id: socketId, name: "Presenter" },
    startedAt: Date.now(),
  };

  roomPresenters.set(roomId, presenter);
  return { success: true, presenter };
}

/**
 * Releases the presenter lock if held by the given socket
 * @param {string} roomId
 * @param {string} socketId
 * @returns {{ success: boolean, released: boolean, reason?: string }}
 */
export function releasePresenter(roomId, socketId) {
  if (!roomId || !socketId) return { success: false, released: false };

  const existing = roomPresenters.get(roomId);
  if (!existing) {
    return { success: true, released: false, reason: "NO_ACTIVE_PRESENTER" };
  }

  if (existing.socketId === socketId) {
    if (existing.trailingTimer) {
      clearTimeout(existing.trailingTimer);
      existing.trailingTimer = null;
    }
    roomPresenters.delete(roomId);
    return { success: true, released: true, previousPresenter: existing };
  }

  return { success: false, released: false, reason: "NOT_LOCK_HOLDER" };
}

/**
 * Returns the active presenter for a room, or null
 * @param {string} roomId
 * @returns {object|null}
 */
export function getActivePresenter(roomId) {
  if (!roomId) return null;
  return roomPresenters.get(roomId) || null;
}

/**
 * Updates presenter synchronization state (lastSyncAt, latestCoords, trailingTimer)
 * @param {string} roomId
 * @param {string} socketId
 * @param {object} updates
 * @returns {boolean}
 */
export function updatePresenterSyncState(roomId, socketId, updates) {
  const existing = roomPresenters.get(roomId);
  if (existing && existing.socketId === socketId) {
    Object.assign(existing, updates);
    return true;
  }
  return false;
}

/**
 * Consolidated disconnect cleanup function:
 * 1. Checks and yields presenter lock if this socket was the presenter
 * 2. Purges socket from presence registry
 * 3. Broadcasts peer-left and presenter-stopped to the room
 *
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export function handleSocketDisconnect(io, socket, reason = "disconnected") {
  const roomId = socket.roomId || socket.data?.roomId;
  if (!roomId) return;

  // Clear roomId on socket immediately so subsequent disconnect calls no-op
  socket.roomId = null;
  if (socket.data) socket.data.roomId = null;

  // 1. Release presenter lock if held
  const releaseRes = releasePresenter(roomId, socket.id);
  if (releaseRes.released) {
    io.to(roomId).emit("presenter:stopped", {
      socketId: socket.id,
      presenterId: socket.id,
      user: socket.user || socket.data?.user,
      reason,
    });
  }

  // 2. Remove peer from room registry
  const remainingPeers = removePeer(roomId, socket.id);

  // 2b. If room is now empty, evict the CanvasDocument from memory to prevent leak.
  // closeCanvasDocument flushes any pending debounced writes to DB before evicting.
  if (remainingPeers.length === 0) {
    closeCanvasDocument(roomId).catch((err) => {
      console.warn(`[presence.service] Failed to close canvas doc for ${roomId}:`, err.message);
    });
  }

  // 3. Broadcast departure to room peers
  socket.to(roomId).emit("presence:peer-left", {
    socketId: socket.id,
    user: socket.user || socket.data?.user,
    reason,
    remainingPeers,
  });
}

/**
 * Clears all in-memory presence and presenter state (used for testing)
 */
export function resetPresenceState() {
  roomPeers.clear();
  roomPresenters.clear();
}
