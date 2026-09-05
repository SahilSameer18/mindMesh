import { Router } from "express";
import * as roomController from "../controllers/room.controller.js";
import { requireRoomAccess } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/:roomId", requireRoomAccess, roomController.getRoom);
router.post("/:roomId", requireRoomAccess, roomController.getOrCreateRoom);
router.patch("/:roomId", requireRoomAccess, roomController.updateRoom);
router.post("/:roomId/zones", requireRoomAccess, roomController.addContextZone);

export default router;