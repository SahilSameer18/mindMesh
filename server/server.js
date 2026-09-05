import http from "http";
import app from "./src/app.js";
import { config } from "./src/config/env.js";
import { initSocketServer } from "./src/realtime/socket.js";

const server = http.createServer(app);

// Initialize Socket.io
initSocketServer(server);

server.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 mindMesh server listening on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health Check: http://localhost:${config.port}/api/health`);
});

const shutdown = () => {
  console.log("\n[Server] Shutting down gracefully...");
  server.close(() => {
    console.log("[Server] Closed HTTP & WebSocket server.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
