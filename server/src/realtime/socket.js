import { Server } from "socket.io";
import { config } from "../config/env.js";
import { initCanvasSocket } from "./canvas.socket.js";
import { setupTranscriptSocketHandlers } from "./transcript.socket.js";
import { setupPresenceSocketHandlers } from "./presence.socket.js";
import { registerRoomSocketHandlers } from "./room.socket.js";
import { registerWebRTCSocketHandlers } from "./webrtc.socket.js";
import { handleSocketDisconnect } from "../services/presence.service.js";
import { socketAuthMiddleware } from "../middlewares/auth.middleware.js";

let io = null;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // Mirrors the Express CORS policy in app.js — allowlist always applies;
      // non-production additionally allows localhost dev origins, not a wildcard.
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = [
          config.clientUrl,
          ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : []),
        ];
        if (allowed.includes(origin)) {
          return callback(null, true);
        }
        if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`[SocketCORS] Blocked origin: ${origin}`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Socket authentication and identity attachment
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} (user: ${socket.data?.user?.name || socket.user?.name || "Guest"})`);

    // Register room channel lifecycle handlers (room:join, room:leave)
    registerRoomSocketHandlers(io, socket);

    // Register canvas real-time collaboration handlers (handles canvas:join, actions)
    initCanvasSocket(io, socket);

    // Register real-time speech and transcript stream handlers
    setupTranscriptSocketHandlers(io, socket);

    // Register real-time presence, cursor, viewport, and presenter handlers
    setupPresenceSocketHandlers(io, socket);

    // Register WebRTC P2P mesh signaling handlers
    registerWebRTCSocketHandlers(io, socket);

    // Consolidated single disconnect handler: releases presenter lock and cleans up presence
    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      handleSocketDisconnect(io, socket);
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