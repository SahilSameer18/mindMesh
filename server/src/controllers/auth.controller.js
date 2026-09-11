import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { config } from "../config/env.js";
import * as authService from "../services/auth.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

const isProd = config.nodeEnv === "production";

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie("session", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refresh", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth", // Restricted path: only sent to auth endpoints
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res) {
  res.clearCookie("session", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
  res.clearCookie("refresh", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth",
  });
}

/**
 * Register a new user account
 */
export async function signup(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return sendError(res, "Validation error", ["Name, email, and password are required"], 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return sendError(res, "Validation error", ["Invalid email format"], 400);
    }

    if (password.length < 6) {
      return sendError(res, "Validation error", ["Password must be at least 6 characters long"], 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return sendError(res, "Conflict", ["An account with this email already exists"], 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: cleanName, email: cleanEmail, passwordHash },
      select: { id: true, name: true, email: true },
    });

    const userPayload = { id: user.id, email: user.email, name: user.name, role: "user" };
    const { accessToken, refreshToken } = await authService.generateAndStoreTokens(user.id, userPayload);
    setAuthCookies(res, accessToken, refreshToken);

    return sendSuccess(res, "Registered successfully", userPayload, 201);
  } catch (err) {
    console.error("[AuthController] Error during signup:", err);
    return sendError(res, "Internal server error", [err.message], 500);
  }
}

/**
 * Log in to an existing account
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return sendError(res, "Validation error", ["Email and password are required"], 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return sendError(res, "Unauthorized", ["Invalid email or password"], 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, "Unauthorized", ["Invalid email or password"], 401);
    }

    const userPayload = { id: user.id, email: user.email, name: user.name, role: "user" };
    const { accessToken, refreshToken } = await authService.generateAndStoreTokens(user.id, userPayload);
    setAuthCookies(res, accessToken, refreshToken);

    return sendSuccess(res, "Logged in successfully", userPayload);
  } catch (err) {
    console.error("[AuthController] Error during login:", err);
    return sendError(res, "Internal server error", [err.message], 500);
  }
}

/**
 * Refresh tokens with token rotation
 */
export async function refresh(req, res) {
  try {
    const rawRefresh = req.cookies?.refresh;
    if (!rawRefresh) {
      return sendError(res, "Unauthorized", ["No refresh token provided"], 401);
    }

    const { accessToken, refreshToken: newRefresh } = await authService.rotateRefreshToken(rawRefresh);
    setAuthCookies(res, accessToken, newRefresh);

    return sendSuccess(res, "Session refreshed successfully");
  } catch (err) {
    clearAuthCookies(res);
    return sendError(
      res,
      err.message || "Failed to refresh token",
      [err.message || "Unauthorized"],
      err.status || 401
    );
  }
}

/**
 * Log out and clear refresh token in database
 */
export async function logout(req, res) {
  try {
    const rawRefresh = req.cookies?.refresh;
    const userId = req.user?.id;

    if (rawRefresh && userId) {
      const active = await prisma.refreshToken.findMany({ where: { userId } });
      for (const record of active) {
        if (await bcrypt.compare(rawRefresh, record.tokenHash)) {
          await prisma.refreshToken.delete({ where: { id: record.id } });
          break;
        }
      }
    }
    clearAuthCookies(res);
    return sendSuccess(res, "Logged out successfully");
  } catch (err) {
    console.error("[AuthController] Error during logout:", err);
    clearAuthCookies(res);
    return sendError(res, "Internal server error", [err.message], 500);
  }
}

/**
 * Log out all active sessions for current user
 */
export async function logoutAll(req, res) {
  try {
    if (req.user?.id) {
      await authService.revokeAllSessions(req.user.id);
    }
    clearAuthCookies(res);
    return sendSuccess(res, "All sessions logged out");
  } catch (err) {
    console.error("[AuthController] Error during logoutAll:", err);
    return sendError(res, "Internal server error", [err.message], 500);
  }
}

/**
 * Get currently authenticated user profile
 */
export async function getMe(req, res) {
  return sendSuccess(res, "Current user retrieved", {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role || "owner",
  });
}

/**
 * List all active sessions for current user
 */
export async function listSessions(req, res) {
  try {
    const sessions = await authService.listSessions(req.user.id);
    return sendSuccess(res, "Active sessions retrieved", sessions);
  } catch (err) {
    console.error("[AuthController] Error during listSessions:", err);
    return sendError(res, "Internal server error", [err.message], 500);
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(req, res) {
  try {
    await authService.revokeSession(req.user.id, req.params.id);
    return sendSuccess(res, "Session revoked");
  } catch (err) {
    console.error("[AuthController] Error during revokeSession:", err);
    return sendError(res, "Internal server error", [err.message], 500);
  }
}

