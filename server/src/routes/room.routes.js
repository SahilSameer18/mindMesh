import { Router } from "express";
import * as roomController from "../controllers/room.controller.js";
import * as reportController from "../controllers/report.controller.js";
import { requireRoomAccess } from "../middlewares/auth.middleware.js";

const router = Router();

// Room lifecycle & mode routes
router.get("/", roomController.listRooms);
router.post("/", roomController.createRoom);
router.get("/:roomId", requireRoomAccess, roomController.getRoom);
router.post("/:roomId", requireRoomAccess, roomController.getOrCreateRoom);
router.patch("/:roomId", requireRoomAccess, roomController.updateRoom);
router.patch("/:roomId/mode", requireRoomAccess, roomController.updateRoomMode);
router.delete("/:roomId", requireRoomAccess, roomController.deleteRoom);
router.get("/:roomId/zones", requireRoomAccess, roomController.getContextZones);
router.post("/:roomId/zones", requireRoomAccess, roomController.addContextZone);
router.delete("/:roomId/zones/:zoneId", requireRoomAccess, roomController.deleteContextZone);

// Phase 7: Meeting Commit & Synthesis routes
router.post("/:roomId/commit", requireRoomAccess, reportController.commitMeeting);
router.get("/:roomId/reports", requireRoomAccess, reportController.getMeetingReports);
router.get("/:roomId/reports/latest", requireRoomAccess, reportController.getLatestReport);
router.post("/:roomId/reports/:reportId/export", requireRoomAccess, reportController.exportMeetingReport);

// Phase 7: Room Integrations
router.get("/:roomId/integrations", requireRoomAccess, reportController.getRoomIntegrations);
router.put("/:roomId/integrations/:provider", requireRoomAccess, reportController.upsertRoomIntegration);

export default router;

