/**
 * Room channel lifecycle and membership socket event handlers.
 * Isolates room:join and room:leave logic from global socket orchestration.
 *
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export function registerRoomSocketHandlers(io, socket) {
  /**
   * Client joins a named room channel
   */
  socket.on("room:join", ({ roomId, user }, callback) => {
    if (!roomId) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Missing roomId" });
      }
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    if (user) {
      socket.user = user;
      if (!socket.data) socket.data = {};
      socket.data.user = user;
      socket.data.roomId = roomId;
    }

    socket.emit("room:joined", {
      roomId,
      socketId: socket.id,
      timestamp: Date.now(),
    });

    socket.to(roomId).emit("room:peer-joined", {
      socketId: socket.id,
      user: socket.user || socket.data?.user || { id: socket.id, name: "Guest" },
    });

    if (typeof callback === "function") {
      callback({ success: true, roomId, socketId: socket.id });
    }
  });

  /**
   * Client explicitly leaves a room channel
   */
  socket.on("room:leave", ({ roomId }, callback) => {
    const targetRoomId = roomId || socket.roomId;
    if (!targetRoomId) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Not in a room" });
      }
      return;
    }

    socket.leave(targetRoomId);

    socket.to(targetRoomId).emit("room:peer-left", {
      socketId: socket.id,
      user: socket.user || socket.data?.user,
    });

    socket.emit("room:left", {
      roomId: targetRoomId,
      timestamp: Date.now(),
    });

    if (socket.roomId === targetRoomId) {
      socket.roomId = null;
    }

    if (typeof callback === "function") {
      callback({ success: true, roomId: targetRoomId });
    }
  });
}

export default registerRoomSocketHandlers;


