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