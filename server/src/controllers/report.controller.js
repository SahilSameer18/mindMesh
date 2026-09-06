/**
 * mindMesh — Meeting Report & Integration Controller
 * REST endpoints enforcing unified response schema { success, message, data }
 * and strict room-scoped integration security.
 */

import { sendSuccess, sendError } from "../utils/response.js";
import { aiService } from "../services/ai.service.js";
import prisma from "../lib/prisma.js";

/**
 * POST /api/rooms/:roomId/commit
 * Commits the current room dialogue and canvas graph into a durable MeetingReport
 */
export async function commitMeeting(req, res, next) {
  try {
    const { roomId } = req.params;
    const { title } = req.body || {};
    const user = req.user;

    const report = await aiService.commitMeeting(roomId, {
      userId: user?.id,
      title,
    });

    return sendSuccess(res, "Meeting successfully synthesized and committed", report, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/rooms/:roomId/reports
 * Lists all historical meeting reports for the room
 */
export async function getMeetingReports(req, res, next) {
  try {
    const { roomId } = req.params;
    const reports = await aiService.getMeetingReports(roomId);
    return sendSuccess(res, "Meeting reports retrieved successfully", reports, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/rooms/:roomId/reports/latest
 * Retrieves the most recently committed meeting report
 */
export async function getLatestReport(req, res, next) {
  try {
    const { roomId } = req.params;
    const report = await aiService.getLatestMeetingReport(roomId);
    return sendSuccess(
      res,
      report ? "Latest meeting report retrieved" : "No reports committed for this room yet",
      report,
      200
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/rooms/:roomId/reports/:reportId/export
 * Dispatches a meeting report to an external provider (Slack, Notion, Resend)
 */
export async function exportMeetingReport(req, res, next) {
  try {
    const { roomId, reportId } = req.params;
    const { provider, config, recipient } = req.body || {};

    if (!provider || typeof provider !== "string") {
      return sendError(res, "Missing required export provider ('slack', 'notion', or 'email')", [], 400);
    }

    const result = await aiService.exportMeetingReport(roomId, reportId, {
      provider,
      config,
      recipient,
    });

    return sendSuccess(res, result.message || "Report exported successfully", result, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/rooms/:roomId/integrations
 * Retrieves active integrations configured for the room
 */
export async function getRoomIntegrations(req, res, next) {
  try {
    const { roomId } = req.params;
    const integrations = await prisma.roomIntegration.findMany({
      where: { roomId },
    });

    return sendSuccess(res, "Room integrations retrieved", integrations, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/rooms/:roomId/integrations/:provider
 * Configures integration credentials strictly scoped to the room
 */
export async function upsertRoomIntegration(req, res, next) {
  try {
    const { roomId, provider } = req.params;
    const { config } = req.body || {};

    if (!config || typeof config !== "object") {
      return sendError(res, "Valid integration config object is required", [], 400);
    }

    const targetProvider = provider.toLowerCase();
    if (!["slack", "notion"].includes(targetProvider)) {
      return sendError(res, "Unsupported provider. Must be 'slack' or 'notion'", [], 400);
    }

    // Room-scoped integration query
    const existing = await prisma.roomIntegration.findFirst({
      where: { roomId, provider: targetProvider },
    });

    let record = null;
    if (existing) {
      const mergedConfig = {
        ...(typeof existing.config === "object" ? existing.config : {}),
        ...config,
      };

      record = await prisma.roomIntegration.update({
        where: { id: existing.id },
        data: { config: mergedConfig },
      });
    } else {
      record = await prisma.roomIntegration.create({
        data: {
          roomId,
          provider: targetProvider,
          config,
        },
      });
    }

    return sendSuccess(res, `Integration configured for ${targetProvider}`, record, 200);
  } catch (error) {
    next(error);
  }
}

export const reportController = {
  commitMeeting,
  getMeetingReports,
  getLatestReport,
  exportMeetingReport,
  getRoomIntegrations,
  upsertRoomIntegration,
};

export default reportController;
