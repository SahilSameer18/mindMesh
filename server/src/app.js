import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { sendSuccess } from "./utils/response.js";
import roomRoutes from "./routes/room.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import authRoutes from "./routes/auth.routes.js";
import inviteRoutes from "./routes/invite.routes.js";

const app = express();

const allowedOrigins = [
  config.clientUrl?.replace(/\/+$/, ""),
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim().replace(/\/+$/, ""))
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server) or in non-production
      if (!origin || config.nodeEnv !== "production") {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`[CORS] Blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  return sendSuccess(res, "mindMesh backend is operational", {
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/rooms", aiRoutes);
app.use("/api", inviteRoutes);

// 404 and Global Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;