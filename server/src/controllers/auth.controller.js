import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { config } from "../config/env.js";
import { sendSuccess, sendError } from "../utils/response.js";

const JWT_SECRET = config.jwtSecret || "mindmesh-secret-key-change-in-prod-2026";
const COOKIE_NAME = "session";

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

/**
 * Register a new user account
 */
export async function signup(req, res) {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      return sendError(res, "Validation error", ["Email, password, and name are required"], 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return sendError(res, "Validation error", ["Invalid email format"], 400);
    }

    if (password.length < 6) {
      return sendError(res, "Validation error", ["Password must be at least 6 characters long"], 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return sendError(res, "Conflict", ["An account with this email already exists"], 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: cleanName,
      },
    });

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "owner",
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });
    setSessionCookie(res, token);

    return sendSuccess(
      res,
      "User registered successfully",
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      201
    );
  } catch (err) {
    console.error("[AuthController] Error during signup:", err.message);
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

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return sendError(res, "Unauthorized", ["Invalid email or password"], 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, "Unauthorized", ["Invalid email or password"], 401);
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "owner",
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });
    setSessionCookie(res, token);

    return sendSuccess(res, "Login successful", {
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (err) {
    console.error("[AuthController] Error during login:", err.message);
    return sendError(res, "Internal server error", [err.message], 500);
  }
}

/**
 * Log out and clear session cookie
 */
export async function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
  });
  return sendSuccess(res, "Logged out successfully");
}

/**
 * Get currently authenticated user profile
 */
export async function getMe(req, res) {
  const user = req.user;

  return sendSuccess(res, "Current user retrieved", {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "owner",
  });
}



