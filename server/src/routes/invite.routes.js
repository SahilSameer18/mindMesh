import { Router } from "express";
import { requireRoomAccess } from "../middlewares/auth.middleware.js";
import * as inviteController from "../controllers/invite.controller.js";

const router = Router();

// Room invite endpoints
router.post("/rooms/:roomId/invites", requireRoomAccess, inviteController.createInvite);
router.get("/invites/:token", inviteController.resolveInvite);
router.post("/invites/:token/join", inviteController.joinAsGuest);

export default router;