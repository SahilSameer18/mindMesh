import rateLimit from "express-rate-limit";
import { sendError } from "../utils/response.js";

/**
 * Standard express-rate-limit middleware for sensitive auth routes (/signup, /login)
 * Limits requests per IP to 15 attempts per 15-minute window
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per window
  standardHeaders: true, // Return rate limit info in standard `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: () => process.env.NODE_ENV === "test", // Bypass during test runs
  handler: (req, res) => {
    return sendError(
      res,
      "Too many attempts",
      ["Too many authentication attempts from this IP. Please try again after 15 minutes."],
      429
    );
  },
});

/**
 * Room creation is deliberately open to signed-out visitors (instant demo-room
 * flow) — this doesn't gate it behind auth, it just caps how many a single IP
 * can spin up so the open endpoint can't be used for unbounded resource creation.
 */
export const roomCreateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    return sendError(
      res,
      "Too many rooms created",
      ["Too many rooms created from this IP recently. Please try again in a few minutes."],
      429
    );
  },
});

/** Guards the guest invite-resolve/join endpoints from brute-force polling. */
export const inviteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    return sendError(res, "Too many attempts", ["Too many invite requests from this IP. Please try again later."], 429);
  },
});

/** Token refresh does a bcrypt-compare scan per call — throttle it independently of login/signup. */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    return sendError(res, "Too many attempts", ["Too many refresh attempts from this IP. Please try again later."], 429);
  },
});

/** AI routes trigger paid LLM calls — throttle independently of general traffic. */
export const aiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    return sendError(res, "Too many AI requests", ["Too many AI requests from this IP. Please slow down."], 429);
  },
});


