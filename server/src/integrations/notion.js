/**
 * mindMesh — Notion Database Dispatcher
 * Creates structured meeting pages with callouts, decision lists, and to-do blocks.
 * Supports automatic zero-key simulation mode.
 */

import { config } from "../config/env.js";

/**
 * Builds Notion API page creation payload
 */
export function buildNotionPagePayload(report, { databaseId = "", roomName = "mindMesh Workspace" } = {}) {
  const children = [
    {
      object: "block",
      type: "callout",
      callout: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `🎯 Executive Summary\n${(report?.executiveSummary || "Meeting commitments recorded.").slice(0, 1800)}`,
            },
          },
        ],
        icon: { emoji: "📋" },
        color: "blue_background",
      },
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "💡 Key Decisions" } }],
      },
    },
  ];

  // Decisions
  if (report?.keyDecisions && report.keyDecisions.length > 0) {
    for (const d of report.keyDecisions.slice(0, 10)) {
      children.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            { type: "text", text: { content: `${d.decision} ` }, annotations: { bold: true } },
            { type: "text", text: { content: `(Owner: ${d.owner || "Team"}) — ${d.context || "Agreed"}` } },
          ],
        },
      });
    }
  } else {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: "No decisions recorded." } }] },
    });
  }

  // Action Items
  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: "🚀 Action Items" } }],
    },
  });

  if (report?.actionItems && report.actionItems.length > 0) {
    for (const t of report.actionItems.slice(0, 15)) {
      children.push({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [
            { type: "text", text: { content: `${t.task} ` } },
            { type: "text", text: { content: `[@${t.assignee || "Unassigned"} | ${t.priority || "medium"}]` }, annotations: { code: true } },
          ],
          checked: !!t.completed,
        },
      });
    }
  }

  // Questions / Risks
  if (report?.unresolvedQuestions && report.unresolvedQuestions.length > 0) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "❓ Open Questions & Risks" } }],
      },
    });

    for (const q of report.unresolvedQuestions.slice(0, 5)) {
      children.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            { type: "text", text: { content: `${q.question}: ` }, annotations: { bold: true } },
            { type: "text", text: { content: `${q.blockerFor || "Review required"}` } },
          ],
        },
      });
    }
  }

  const payload = {
    children,
  };

  if (databaseId) {
    payload.parent = { database_id: databaseId };
    payload.properties = {
      Name: {
        title: [{ text: { content: `📋 Meeting Commit: ${roomName}` } }],
      },
    };
  }

  return payload;
}

/**
 * Creates a meeting page in a Notion database or executes in simulation mode
 */
export async function sendMeetingToNotion(apiKey, databaseId, report, opts = {}) {
  const token = (apiKey || config.notionToken || "").trim();
  const dbId = (databaseId || "").trim();
  const payload = buildNotionPagePayload(report, { databaseId: dbId, roomName: opts.roomName });

  if (!token || !dbId) {
    console.info(
      "[Notion Integration: SIMULATION MODE] NOTION_TOKEN or databaseId missing. Generating simulated page payload."
    );
    return {
      success: true,
      simulated: true,
      provider: "notion",
      message: "Simulated Notion export successful. Set NOTION_TOKEN in server/.env for live exports.",
      payload,
    };
  }

  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Notion API responded with HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      success: true,
      simulated: false,
      provider: "notion",
      message: "Successfully created Notion meeting page.",
      pageId: data.id,
      url: data.url,
    };
  } catch (error) {
    console.error("[Notion Integration] Page creation failed:", error.message);
    throw error;
  }
}

export const notionIntegration = {
  buildNotionPagePayload,
  sendMeetingToNotion,
};

export default notionIntegration;
