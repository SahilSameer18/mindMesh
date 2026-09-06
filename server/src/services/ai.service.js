/**
 * mindMesh — AI Meeting Commit & Synthesis Service
 * Orchestrates dual-source meeting synthesis, Prisma persistence,
 * single-flight Promise sharing, cooldown caching, and external dispatching.
 */

import prisma from "../lib/prisma.js";
import { getCanvasDocument } from "../canvas/canvasDocument.js";
import { generateMeetingSummary, reportToMarkdown } from "../ai/summarization.js";
import { sendMeetingToSlack } from "../integrations/slack.js";
import { sendMeetingToNotion } from "../integrations/notion.js";
import { sendMeetingEmail } from "../integrations/email.js";
import { getIO } from "../realtime/socket.js";
import { config } from "../config/env.js";

// Concurrency Controls
const activeCommits = new Map(); // roomId -> Promise<object>
const recentCommits = new Map(); // roomId -> { report: object, completedAt: number }
const COOLDOWN_MS = 15000; // 15 seconds

function resolveIO(customIO) {
  if (customIO) return customIO;
  try {
    return getIO();
  } catch {
    return null;
  }
}

function parseStoredSummary(summaryStr, tasksJson) {
  let executiveSummary = "";
  let keyDecisions = [];
  let unresolvedQuestions = [];
  let tags = [];

  try {
    const parsed = JSON.parse(summaryStr);
    executiveSummary = parsed.executiveSummary || "";
    keyDecisions = Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [];
    unresolvedQuestions = Array.isArray(parsed.unresolvedQuestions) ? parsed.unresolvedQuestions : [];
    tags = Array.isArray(parsed.tags) ? parsed.tags : [];
  } catch {
    // If stored as plain markdown string
    executiveSummary = summaryStr;
  }

  return {
    executiveSummary,
    keyDecisions,
    actionItems: Array.isArray(tasksJson) ? tasksJson : [],
    unresolvedQuestions,
    tags,
  };
}

/**
 * Commits a meeting room: gathers transcripts & canvas graph, synthesizes via LLM,
 * persists to PostgreSQL, and broadcasts meeting:committed via WebSockets.
 * Employs Promise-sharing coalescing to eliminate duplicate LLM calls on rapid clicks.
 *
 * @param {string} roomId
 * @param {object} [options]
 * @param {string} [options.userId]
 * @param {string} [options.title]
 * @param {object} [options.io]
 * @returns {Promise<object>} Authoritative MeetingReport
 */
export async function commitMeeting(roomId, { userId = null, title = null, io = null } = {}) {
  if (!roomId || typeof roomId !== "string") {
    throw new Error("[commitMeeting] roomId is required");
  }

  // 1. Single-Flight Promise Sharing: join active in-flight promise if one exists
  if (activeCommits.has(roomId)) {
    console.info(`[commitMeeting] Joining in-flight synthesis promise for room: ${roomId}`);
    return await activeCommits.get(roomId);
  }

  // 2. 15-Second Cooldown Cache: return recent report if recently completed
  const recent = recentCommits.get(roomId);
  if (recent && Date.now() - recent.completedAt < COOLDOWN_MS) {
    console.info(`[commitMeeting] Returning cached recent report for room: ${roomId} (cooldown active)`);
    return { ...recent.report, cached: true };
  }

  // 3. Initiate Synthesis Execution
  const commitPromise = (async () => {
    try {
      // Gather authoritative CanvasDocument state
      const doc = await getCanvasDocument(roomId);
      const canvasState = doc.getState();
      const nodes = canvasState.nodes || [];
      const edges = canvasState.edges || [];

      // Fetch Room record
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });
      const roomMode = room?.mode || "operational";
      const roomName = title || room?.name || "mindMesh Workspace Session";

      // Fetch chronological spoken transcripts
      const transcripts = await prisma.transcriptChunk.findMany({
        where: { roomId },
        orderBy: { createdAt: "asc" },
      });

      // Run Dual-Source Synthesizer with LLM fallback and deterministic safety net
      const summaryData = await generateMeetingSummary({
        roomId,
        transcripts,
        nodes,
        edges,
        roomMode,
      });

      // Persist in Neon PostgreSQL
      const serializedSummary = JSON.stringify({
        executiveSummary: summaryData.executiveSummary,
        keyDecisions: summaryData.keyDecisions,
        unresolvedQuestions: summaryData.unresolvedQuestions,
        tags: summaryData.tags,
      });

      const reportRecord = await prisma.meetingReport.create({
        data: {
          roomId,
          summary: serializedSummary,
          tasks: summaryData.actionItems,
        },
      });

      // Format final public report structure
      const report = {
        id: reportRecord.id,
        roomId: reportRecord.roomId,
        roomName,
        executiveSummary: summaryData.executiveSummary,
        keyDecisions: summaryData.keyDecisions,
        actionItems: summaryData.actionItems,
        unresolvedQuestions: summaryData.unresolvedQuestions,
        tags: summaryData.tags,
        emailedTo: reportRecord.emailedTo,
        createdAt: reportRecord.createdAt,
        provider: summaryData.provider,
        model: summaryData.model,
      };

      // Broadcast meeting:committed over Socket.io mesh
      const socketIO = resolveIO(io);
      if (socketIO) {
        socketIO.to(roomId).emit("meeting:committed", report);
      }

      // Cache report for 15s cooldown
      recentCommits.set(roomId, {
        report,
        completedAt: Date.now(),
      });

      return report;
    } finally {
      activeCommits.delete(roomId);
    }
  })();

  activeCommits.set(roomId, commitPromise);
  return await commitPromise;
}

/**
 * Retrieves historical meeting reports for a room
 */
export async function getMeetingReports(roomId) {
  if (!roomId) throw new Error("[getMeetingReports] roomId is required");

  const records = await prisma.meetingReport.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
  });

  return records.map((rec) => {
    const parsed = parseStoredSummary(rec.summary, rec.tasks);
    return {
      id: rec.id,
      roomId: rec.roomId,
      ...parsed,
      emailedTo: rec.emailedTo,
      createdAt: rec.createdAt,
    };
  });
}

/**
 * Retrieves the most recent meeting report for a room
 */
export async function getLatestMeetingReport(roomId) {
  if (!roomId) throw new Error("[getLatestMeetingReport] roomId is required");

  const rec = await prisma.meetingReport.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
  });

  if (!rec) return null;

  const parsed = parseStoredSummary(rec.summary, rec.tasks);
  return {
    id: rec.id,
    roomId: rec.roomId,
    ...parsed,
    emailedTo: rec.emailedTo,
    createdAt: rec.createdAt,
  };
}

/**
 * Exports a meeting report to an external provider (Slack, Notion, Resend)
 */
export async function exportMeetingReport(roomId, reportId, { provider, config: userConfig = {}, recipient = null, clientUrl = null } = {}) {
  if (!roomId || !reportId || !provider) {
    throw new Error("[exportMeetingReport] roomId, reportId, and provider are required");
  }

  const reportRecord = await prisma.meetingReport.findUnique({
    where: { id: reportId },
  });

  if (!reportRecord || reportRecord.roomId !== roomId) {
    throw new Error(`Meeting report not found for id "${reportId}" in room "${roomId}"`);
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const roomName = room?.name || "mindMesh Workspace";
  const parsed = parseStoredSummary(reportRecord.summary, reportRecord.tasks);
  const report = {
    id: reportRecord.id,
    roomId,
    roomName,
    ...parsed,
    emailedTo: reportRecord.emailedTo,
    createdAt: reportRecord.createdAt,
  };

  let dispatchResult = null;
  const targetProvider = provider.toLowerCase();

  // 1. Read stored integration config from database for this room
  const storedIntegration = await prisma.roomIntegration.findFirst({
    where: { roomId, provider: targetProvider },
  });
  const storedConfig = (storedIntegration?.config && typeof storedIntegration.config === "object")
    ? storedIntegration.config
    : {};

  // 2. Fallback hierarchy: explicit userConfig -> stored room config -> global .env
  switch (targetProvider) {
    case "slack": {
      const webhookUrl = userConfig.webhookUrl || storedConfig.webhookUrl || config.slackWebhookUrl;
      dispatchResult = await sendMeetingToSlack(webhookUrl, report, {
        roomName,
        roomId,
        clientUrl: clientUrl || config.clientUrl,
      });
      break;
    }

    case "notion": {
      const apiKey = userConfig.apiKey || storedConfig.apiKey || config.notionToken;
      const databaseId = userConfig.databaseId || userConfig.database_id || storedConfig.databaseId || storedConfig.database_id;
      dispatchResult = await sendMeetingToNotion(apiKey, databaseId, report, {
        roomName,
      });
      break;
    }

    case "email": {
      const targetEmail = recipient || userConfig.toEmail || storedConfig.toEmail || reportRecord.emailedTo;
      dispatchResult = await sendMeetingEmail(targetEmail, report, {
        roomName,
        roomId,
        clientUrl: clientUrl || config.clientUrl,
      });

      if (dispatchResult && !dispatchResult.simulated && targetEmail) {
        await prisma.meetingReport.update({
          where: { id: reportId },
          data: { emailedTo: targetEmail },
        });
      }
      break;
    }

    default:
      throw new Error(`Unsupported export provider: "${provider}". Expected "slack", "notion", or "email".`);
  }

  // 3. Update audit log while preserving stored credentials (non-destructive merge)
  try {
    const mergedConfig = {
      ...storedConfig,
      ...userConfig,
      lastExportAt: new Date().toISOString(),
      lastStatus: dispatchResult.simulated ? "simulated" : "delivered",
    };

    if (storedIntegration) {
      await prisma.roomIntegration.update({
        where: { id: storedIntegration.id },
        data: { config: mergedConfig },
      });
    } else {
      await prisma.roomIntegration.create({
        data: {
          roomId,
          provider: targetProvider,
          config: mergedConfig,
        },
      });
    }
  } catch (auditErr) {
    console.warn(`[exportMeetingReport] Non-critical audit record write failed:`, auditErr.message);
  }

  return dispatchResult;
}

export const aiService = {
  commitMeeting,
  getMeetingReports,
  getLatestMeetingReport,
  exportMeetingReport,
};

export default aiService;


