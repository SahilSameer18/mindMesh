import { Router } from "express";
import * as aiController from "../controllers/ai.controller.js";
import { requireRoomAccess } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/:roomId/ai-actions", requireRoomAccess, aiController.getAIActions);
router.post("/:roomId/ai-actions/:actionId/approve", requireRoomAccess, aiController.approveAIAction);
router.post("/:roomId/ai-actions/:actionId/reject", requireRoomAccess, aiController.rejectAIAction);
router.post("/:roomId/agenda", requireRoomAccess, aiController.generateAgenda);

export default router;