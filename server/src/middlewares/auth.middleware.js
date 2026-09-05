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
};

export const SECONDARY_DEMO_USER = {
  id: "demo-user-2",
  name: "Marcus Sterling",
  email: "marcus@mindmesh.ai",
  role: "member",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
  color: "#06B6D4", // neon cyan
};

/**
 * Extract authenticated user or return demo identity
 */
export function getCurrentUser(req) {
  try {
    const token = req.cookies?.session || req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret || "mindmesh-secret-key-change-in-prod-2026");
      return decoded;
    }
  } catch (err) {
    // Token invalid or expired, continue to fallback demo identity during early phases
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
  if (!user) {
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

