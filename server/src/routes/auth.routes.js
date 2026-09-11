import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// Public Authentication Endpoints (rate-limited against brute-force attacks)
router.post("/signup", authRateLimiter, authController.signup);
router.post("/login", authRateLimiter, authController.login);

// CRITICAL GUARD: /refresh MUST NOT have requireAuth middleware!
// The access token is expired by definition when this endpoint is requested.
// Adding requireAuth creates an unrecoverable 401 infinite loop.
router.post("/refresh", authController.refresh);

// Protected Endpoints
router.get("/me", requireAuth, authController.getMe);
router.post("/logout", requireAuth, authController.logout);
router.post("/logout-all", requireAuth, authController.logoutAll);
router.get("/sessions", requireAuth, authController.listSessions);
router.delete("/sessions/:id", requireAuth, authController.revokeSession);

export default router;