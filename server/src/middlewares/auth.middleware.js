import { verifyAccessToken, verifyGuestToken } from "../utils/tokens.js";
import { sendError } from "../utils/response.js";
import prisma from "../lib/prisma.js";

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

function parseCookies(cookieHeader = "") {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

/**
 * Extract authenticated user or return null / demo identity
 */
export function getCurrentUser(req) {
  try {
    const token = req.cookies?.session;
    if (token) {
      const decoded = verifyAccessToken(token);
      return { ...decoded, isDemo: false };
    }
  } catch {
    // Token invalid or expired
  }

  // Header override for multi-user simulation testing (e.g. x-demo-user: "marcus")
  const demoHeader = req.headers?.["x-demo-user"];
  if (demoHeader === "marcus" || demoHeader === "2") {
    return SECONDARY_DEMO_USER;
  }

  return null;
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
  const { roomId } = req.params;
  const user = getCurrentUser(req);

  // 1. Check if user is authenticated member
  if (user && !user.isDemo) {
    req.user = user;
    if (roomId) {
      try {
        const membership = await prisma.roomMember.findUnique({
          where: {
            roomId_userId: {
              roomId,
              userId: user.id,
            },
          },
        });

        if (membership) {
          req.roomRole = membership.role;
          return next();
        }
      } catch (err) {
        console.error("[requireRoomAccess] DB error:", err.message);
      }
    } else {
      req.roomRole = user.role || "member";
      return next();
    }
  }

  // 2. Check if user has a valid guest session for this room
  const guestToken = req.cookies?.guest_session;
  if (guestToken) {
    try {
      const guest = verifyGuestToken(guestToken);
      if (!roomId || guest.roomId === roomId) {
        req.user = { id: `guest-${guest.name}`, name: guest.name, isGuest: true, isDemo: false };
        req.roomRole = "member";
        return next();
      }
    } catch {
      // Invalid guest token
    }
  }

  // 3. Fallback to demo identity for developer prototype testing
  const demoHeader = req.headers?.["x-demo-user"];
  if (demoHeader) {
    const demo = demoHeader === "marcus" || demoHeader === "2" ? SECONDARY_DEMO_USER : DEMO_USER;
    req.user = demo;
    req.roomRole = demo.role;
    return next();
  }

  return sendError(res, "Access denied", ["You do not have access to this room"], 403);
}

/**
 * Socket.io Handshake Authentication Middleware
 * Validates JWT access token or guest session cookie.
 */
export function socketAuthMiddleware(socket, next) {
  try {
    const cookieHeader = socket.handshake.headers?.cookie || "";
    const cookies = parseCookies(cookieHeader);

    // Query demo override for multi-agent simulation (?as=marcus)
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

    // 1. Authenticated user access token
    if (cookies.session) {
      try {
        const decoded = verifyAccessToken(cookies.session);
        const authenticatedUser = { ...decoded, isGuest: false, isDemo: false };
        socket.user = authenticatedUser;
        socket.data.user = authenticatedUser;
        return next();
      } catch {
        // Fall through to guest check
      }
    }

    // 2. Guest room session
    if (cookies.guest_session) {
      try {
        const guest = verifyGuestToken(cookies.guest_session);
        const queryRoomId = socket.handshake.query?.roomId;
        if (guest.roomId && queryRoomId && guest.roomId !== queryRoomId) {
          return next(new Error("Guest token is not authorized for this room"));
        }
        const guestUser = {
          id: `guest-${guest.name}`,
          name: guest.name,
          roomId: guest.roomId,
          isGuest: true,
          isDemo: false,
        };
        socket.user = guestUser;
        socket.data.user = guestUser;
        return next();
      } catch {
        return next(new Error("Invalid or expired guest session"));
      }
    }

    // Fallback for demo connection
    socket.user = DEMO_USER;
    socket.data.user = DEMO_USER;
    return next();
  } catch (err) {
    console.error("[SocketAuth] Error in socket handshake auth:", err.message);
    return next(new Error("Authentication failed"));
  }
}