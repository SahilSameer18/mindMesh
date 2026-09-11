import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as inviteController from "../controllers/invite.controller.js";

const router = Router();

// Room invite endpoints
router.post("/rooms/:roomId/invites", requireAuth, inviteController.createInvite);
router.get("/invites/:token", inviteController.resolveInvite);
router.post("/invites/:token/join", inviteController.joinAsGuest);

export default router;