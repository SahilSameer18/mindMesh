import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { sendError } from "../utils/response.js";

export const DEMO_USER = {
  id: "demo-user-1",
  name: "Elena Vance",
  email: "elena@mindmesh.ai",
  role: "owner",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
  color: "#8B5CF6", // glowing violet
  isDemo: true,
};

export const SECONDARY_DEMO_USER = {
  id: "demo-user-2",
  name: "Marcus Sterling",
  email: "marcus@mindmesh.ai",
  role: "member",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
  color: "#06B6D4", // neon cyan
  isDemo: true,
};

/**
 * Extract authenticated user or return demo identity
 */
export function getCurrentUser(req) {
  try {
    const token = req.cookies?.session;
    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret || "mindmesh-secret-key-change-in-prod-2026");
      return { ...decoded, isDemo: false };
    }
  } catch (err) {
    // Token invalid or expired, continue to fallback demo identity
  }

  // Header override for multi-user simulation testing (e.g. x-demo-user: "marcus")
  const demoHeader = req.headers?.["x-demo-user"];
  if (demoHeader === "marcus" || demoHeader === "2") {
    return SECONDARY_DEMO_USER;
  }

  return DEMO_USER;
}

export function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user || user.isDemo) {
    return sendError(res, "Authentication required", ["Not authenticated"], 401);
  }
  req.user = user;
  next();
}

export async function requireRoomAccess(req, res, next) {
  const user = getCurrentUser(req);
  req.user = user;
  req.roomRole = user.role || "member";
  next();
}

/**
 * Socket.io Handshake Authentication Middleware
 * Validates JWT cookie if present; applies query ?as=marcus demo override;
 * populates socket.user and socket.data.user
 */
export function socketAuthMiddleware(socket, next) {
  try {
    const rawCookie = socket.handshake.headers?.cookie || "";
    const match = rawCookie.match(/(?:^|;\s*)session=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    // Check explicit demo mode override in query string (?as=marcus)
    const asParam = socket.handshake.query?.as?.toLowerCase();
    if (asParam === "marcus") {
      socket.user = SECONDARY_DEMO_USER;
      socket.data.user = SECONDARY_DEMO_USER;
      return next();
    }
    if (asParam === "elena") {
      socket.user = DEMO_USER;
      socket.data.user = DEMO_USER;
      return next();
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret || "mindmesh-secret-key-change-in-prod-2026");
        const authenticatedUser = { ...decoded, isDemo: false };
        socket.user = authenticatedUser;
        socket.data.user = authenticatedUser;
        return next();
      } catch {
        // Token invalid, fall through to demo guest
      }
    }

    // Default guest identity
    socket.user = DEMO_USER;
    socket.data.user = DEMO_USER;
    next();
  } catch (err) {
    console.error("[SocketAuth] Error in socket handshake auth:", err.message);
    socket.user = DEMO_USER;
    socket.data.user = DEMO_USER;
    next();
  }
}


