/**
 * mindMesh — Resend Transactional Email Dispatcher
 * Generates dark-mode responsive HTML executive briefings with automatic simulation mode.
 */

import { config } from "../config/env.js";

/**
 * Escapes unsafe HTML characters to prevent malformed email markup
 */
function escapeHtml(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Builds a responsive, dark-mode branded HTML email briefing
 */
export function buildMeetingEmailHtml(report, { roomName = "mindMesh Workspace", roomId = "", clientUrl = config.clientUrl || "http://localhost:5173" } = {}) {
  const workspaceUrl = roomId ? `${clientUrl}/?room=${encodeURIComponent(roomId)}` : clientUrl;
  const safeRoomName = escapeHtml(roomName);
  const safeRoomId = escapeHtml(roomId);

  const decisionsHtml =
    report?.keyDecisions && report.keyDecisions.length > 0
      ? report.keyDecisions
          .map(
            (d) => `
          <div style="margin-bottom: 12px; padding: 12px; background-color: #1e293b; border-radius: 8px; border-left: 3px solid #38bdf8;">
            <div style="font-weight: 600; color: #f8fafc; font-size: 14px;">${escapeHtml(d.decision)}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Owner: <strong>${escapeHtml(d.owner || "Team")}</strong> &bull; ${escapeHtml(d.context || "Agreed")}</div>
          </div>
        `
          )
          .join("")
      : '<p style="color: #64748b; font-size: 13px;">No explicit decisions recorded.</p>';

  const tasksHtml =
    report?.actionItems && report.actionItems.length > 0
      ? `
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; text-align: left; color: #94a3b8;">
              <th style="padding: 8px 4px;">Task</th>
              <th style="padding: 8px 4px;">Assignee</th>
              <th style="padding: 8px 4px;">Priority</th>
            </tr>
          </thead>
          <tbody>
            ${report.actionItems
              .map(
                (t) => `
              <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 8px 4px; color: #f8fafc;">${t.completed ? "✅ " : "⬜ "}<strong>${escapeHtml(t.task)}</strong></td>
                <td style="padding: 8px 4px; color: #38bdf8;"><code>${escapeHtml(t.assignee || "Unassigned")}</code></td>
                <td style="padding: 8px 4px; color: ${t.priority === "high" ? "#f43f5e" : "#f59e0b"};">${escapeHtml(t.priority || "medium")}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
      : '<p style="color: #64748b; font-size: 13px;">No action items recorded.</p>';

  const questionsHtml =
    report?.unresolvedQuestions && report.unresolvedQuestions.length > 0
      ? report.unresolvedQuestions
          .map(
            (q) => `
          <div style="margin-bottom: 8px; padding: 8px 12px; background-color: #2e1065; border-radius: 6px; border: 1px solid #7c3aed; font-size: 12px; color: #e9d5ff;">
            <strong>❓ ${escapeHtml(q.question)}</strong> &mdash; <em>${escapeHtml(q.blockerFor || "Requires team review")}</em>
          </div>
        `
          )
          .join("")
      : "";

  const safeSummary = escapeHtml(report?.executiveSummary || "Meeting commitments recorded.").replace(/\n/g, "<br>");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>mindMesh Meeting Commit: ${safeRoomName}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #1e293b;">
        <div style="font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">mindMesh Executive Synthesis</div>
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">${safeRoomName}</h1>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">
          Committed on ${new Date().toLocaleDateString()} &bull; Room: <code>${safeRoomId || "workspace"}</code>
        </div>
      </td>
    </tr>

    <!-- Executive Summary -->
    <tr>
      <td style="padding: 24px 24px 16px 24px;">
        <h2 style="margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8;">🎯 Executive Summary</h2>
        <div style="font-size: 14px; line-height: 1.6; color: #cbd5e1; background-color: #1e293b; padding: 16px; border-radius: 8px; border: 1px solid #334155;">
          ${safeSummary}
        </div>
      </td>
    </tr>

    <!-- Decisions -->
    <tr>
      <td style="padding: 8px 24px;">
        <h2 style="margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8;">💡 Key Decisions Ratified</h2>
        ${decisionsHtml}
      </td>
    </tr>

    <!-- Action Items -->
    <tr>
      <td style="padding: 16px 24px;">
        <h2 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8;">🚀 Action Items</h2>
        ${tasksHtml}
      </td>
    </tr>

    <!-- Questions -->
    ${
      questionsHtml
        ? `
    <tr>
      <td style="padding: 8px 24px 16px 24px;">
        <h2 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #c084fc;">❓ Open Questions & Risks</h2>
        ${questionsHtml}
      </td>
    </tr>
    `
        : ""
    }

    <!-- Call to Action -->
    <tr>
      <td style="padding: 24px; text-align: center; border-top: 1px solid #1e293b; background-color: #0b1120;">
        <a href="${workspaceUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">
          Open Interactive Workspace Canvas 🚀
        </a>
        <div style="font-size: 11px; color: #64748b; margin-top: 16px;">
          mindMesh &bull; The conversation becomes the canvas.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches an email briefing via Resend API, or runs in simulation mode
 */
export async function sendMeetingEmail(toEmail, report, opts = {}) {
  const recipient = (toEmail || opts.recipient || "").trim();
  if (!recipient || !recipient.includes("@")) {
    throw new Error("A valid recipient email address is required.");
  }

  const html = buildMeetingEmailHtml(report, opts);
  const apiKey = (config.resendApiKey || "").trim();

  if (!apiKey) {
    console.info(
      `[Email Integration: SIMULATION MODE] No RESEND_API_KEY set. Simulated email delivery to ${recipient}.`
    );
    return {
      success: true,
      simulated: true,
      provider: "email",
      message: `Simulated email delivery to ${recipient}. Set RESEND_API_KEY in server/.env for live delivery.`,
      to: recipient,
      html,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "mindMesh <onboarding@resend.dev>",
        to: [recipient],
        subject: `📋 Meeting Commit: ${opts.roomName || "Workspace Session"}`,
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Resend API responded with HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      success: true,
      simulated: false,
      provider: "email",
      message: `Successfully emailed meeting report to ${recipient}.`,
      deliveryId: data.id,
    };
  } catch (error) {
    console.error("[Email Integration] Resend dispatch failed:", error.message);
    throw error;
  }
}

export const emailIntegration = {
  buildMeetingEmailHtml,
  sendMeetingEmail,
};

export default emailIntegration;
