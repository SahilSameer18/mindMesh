import { Server } from "socket.io";
import { initCanvasSocket } from "./canvas.socket.js";

let io = null;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Register canvas real-time collaboration handlers (handles canvas:join, presence, actions)
    initCanvasSocket(io, socket);

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