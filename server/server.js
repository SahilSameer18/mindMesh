import http from "http";
import app from "./src/app.js";
import { config, validateEnvironment } from "./src/config/env.js";
import { initSocketServer } from "./src/realtime/socket.js";

// Production security check: ensure JWT_SECRET is explicitly configured before binding port
if (config.nodeEnv === "production" && !process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable must be set in production. Refusing to start.");
  process.exit(1);
}

const server = http.createServer(app);

// Initialize Socket.io
const io = initSocketServer(server);

server.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 mindMesh server listening on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health Check: http://localhost:${config.port}/api/health`);
  validateEnvironment();
});

let isShuttingDown = false;
const shutdown = (signal) => {
  if (isShuttingDown) {
    process.exit(0);
  }
  isShuttingDown = true;
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);

  try {
    io.close();
  } catch {}

  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }

  server.close(() => {
    console.log("[Server] Closed HTTP & WebSocket server.");
    process.exit(0);
  });

  // Failsafe: Force-exit after 500ms if any socket is still held
  setTimeout(() => {
    process.exit(0);
  }, 500).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Nodemon graceful reload support
process.once("SIGUSR2", () => {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  server.close(() => {
    process.kill(process.pid, "SIGUSR2");
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("[Server Error] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Server Error] Uncaught Exception:", err);
});
