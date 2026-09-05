import { Server } from "socket.io";

let io = null;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("room:join", ({ roomId, user }) => {
      if (!roomId) return;
      socket.join(roomId);
      socket.roomId = roomId;
      socket.user = user || { id: socket.id, name: "Collaborator" };

      console.log(`[Socket] User ${socket.user.name} (${socket.id}) joined room ${roomId}`);

      // Notify others in room
      socket.to(roomId).emit("presence:peer-joined", {
        user: socket.user,
        socketId: socket.id,
      });
    });

    socket.on("room:leave", ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomId);
      socket.to(roomId).emit("presence:peer-left", {
        socketId: socket.id,
        user: socket.user,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      if (socket.roomId) {
        socket.to(socket.roomId).emit("presence:peer-left", {
          socketId: socket.id,
          user: socket.user,
        });
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("[Socket] Socket server has not been initialized yet");
  }
  return io;
}
