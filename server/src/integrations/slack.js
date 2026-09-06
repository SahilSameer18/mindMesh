/**
 * mindMesh — Slack Block Kit Dispatcher
 * Formats structured meeting commitments into rich Block Kit layouts
 * with automatic zero-key simulation mode fallback.
 */

import { config } from "../config/env.js";

/**
 * Builds a valid Slack Block Kit payload from a MeetingReport
 */
export function buildSlackBlockKit(report, { roomName = "mindMesh Workspace", roomId = "", clientUrl = config.clientUrl || "http://localhost:5173" } = {}) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 mindMesh Commit: ${roomName}`.slice(0, 150),
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Committed:* <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toLocaleString()}> | *Room:* \`${roomId || "workspace"}\``,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎯 Executive Summary*\n${report?.executiveSummary || "Meeting commitments synthesized on canvas."}`.slice(0, 2900),
      },
    },
  ];

  // Decisions
  if (report?.keyDecisions && report.keyDecisions.length > 0) {
    const decisionText = report.keyDecisions
      .slice(0, 5)
      .map((d) => `• *${d.decision}* (Owner: \`${d.owner || "Team"}\`)\n  _${d.context || "Agreed upon"}_`)
      .join("\n");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💡 Key Decisions*\n${decisionText}`.slice(0, 2900),
      },
    });
  }

  // Action Items
  if (report?.actionItems && report.actionItems.length > 0) {
    const actionText = report.actionItems
      .slice(0, 8)
      .map((t) => `• ${t.completed ? "☑️" : "⬜"} *${t.task}* — \`${t.assignee || "Unassigned"}\` [${t.priority || "medium"}]`)
      .join("\n");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🚀 Action Items*\n${actionText}`.slice(0, 2900),
      },
    });
  }

  // Open Questions / Risks
  if (report?.unresolvedQuestions && report.unresolvedQuestions.length > 0) {
    const questionsText = report.unresolvedQuestions
      .slice(0, 3)
      .map((q) => `• ⚠️ *${q.question}* (${q.blockerFor || "Follow-up required"})`)
      .join("\n");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*❓ Unresolved Questions & Risks*\n${questionsText}`.slice(0, 2900),
      },
    });
  }

  // Action button linking back to workspace
  const workspaceUrl = roomId ? `${clientUrl}/?room=${encodeURIComponent(roomId)}` : clientUrl;
  blocks.push(
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Open Workspace Canvas 🚀",
            emoji: true,
          },
          url: workspaceUrl,
          style: "primary",
        },
      ],
    }
  );

  return blocks;
}

/**
 * Dispatches meeting report to a Slack Incoming Webhook, or runs in simulation mode
 */
export async function sendMeetingToSlack(webhookUrl, report, opts = {}) {
  const targetUrl = (webhookUrl || config.slackWebhookUrl || "").trim();
  const blocks = buildSlackBlockKit(report, opts);

  if (!targetUrl || targetUrl === "simulation" || targetUrl.includes("example.com")) {
    console.info(
      "[Slack Integration: SIMULATION MODE] No live SLACK_WEBHOOK_URL set. Simulated payload generated successfully."
    );
    return {
      success: true,
      simulated: true,
      provider: "slack",
      message: "Simulated Slack dispatch successful. Set SLACK_WEBHOOK_URL in server/.env for live posts.",
      blocks,
    };
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `📋 mindMesh Meeting Commit: ${opts.roomName || "Workspace Session"}`,
        blocks,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Slack API responded with HTTP ${response.status}: ${errText}`);
    }

    return {
      success: true,
      simulated: false,
      provider: "slack",
      message: "Successfully posted meeting report to Slack webhook.",
    };
  } catch (error) {
    console.error("[Slack Integration] HTTP post failed:", error.message);
    throw error;
  }
}

export const slackIntegration = {
  buildSlackBlockKit,
  sendMeetingToSlack,
};

export default slackIntegration;
