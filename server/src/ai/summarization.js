/**
 * mindMesh — Meeting Commit Summarization Engine
 * Synthesizes dialogue transcripts and visual canvas graph into an authoritative MeetingReport.
 * Includes automatic Groq -> Gemini failover and high-fidelity deterministic fallback.
 */

import { withFallback } from "./providers/index.js";

/**
 * Generate a high-fidelity qualitative summary directly from canvas entities and transcripts
 * when all LLM providers are offline or rate-limited.
 */
export function generateDeterministicSummary(nodes = [], edges = [], transcripts = [], roomMode = "operational") {
  const goals = nodes.filter((n) => n.type === "goal");
  const tasks = nodes.filter((n) => n.type === "task");
  const decisions = nodes.filter((n) => n.type === "decision");
  const questions = nodes.filter((n) => n.type === "question");
  const risks = nodes.filter((n) => n.type === "risk");

  // Paragraph 1: Strategic Objectives
  let p1 = "";
  if (goals.length > 0) {
    const goalList = goals.map((g) => `"${g.text}"`).join(", ");
    p1 = `During this ${roomMode} session, the team focused on core objectives including ${goalList}. A total of ${tasks.length} active commitments and ${decisions.length} key decisions were ratified on the visual canvas.`;
  } else {
    p1 = `During this ${roomMode} session, the team established ${tasks.length} active workstreams and ${decisions.length} strategic decisions across the collaborative workspace.`;
  }

  // Paragraph 2: Execution Pathways & Dependencies
  let p2 = "";
  if (tasks.length > 0) {
    const taskDetails = tasks
      .slice(0, 4)
      .map((t) => `${t.text}${t.metadata?.assignee ? ` (${t.metadata.assignee})` : ""}`)
      .join("; ");
    
    let edgeDetails = "";
    if (edges.length > 0) {
      const nodeMap = new Map(nodes.map((n) => [n.id, n.text]));
      const edgeDescriptions = edges
        .slice(0, 3)
        .map((e) => `"${nodeMap.get(e.fromId) || "Task"}" ${e.type || "blocks"} "${nodeMap.get(e.toId) || "Task"}"`)
        .join(", ");
      edgeDetails = ` Critical dependencies identified include: ${edgeDescriptions}.`;
    }

    p2 = `Primary execution pathways center around ${taskDetails}.${edgeDetails}`;
  } else {
    p2 = "The discussion explored exploratory concepts with ongoing refinement required to finalize execution timelines.";
  }

  // Paragraph 3: Risk Registry & Follow-ups
  let p3 = "";
  const openItems = [...questions, ...risks];
  if (openItems.length > 0) {
    const itemList = openItems.slice(0, 3).map((q) => `"${q.text}"`).join(", ");
    p3 = `Key inquiries and risks flagged for immediate follow-up: ${itemList}.`;
  } else {
    p3 = "No critical blockers or unresolved questions were surfaced at commit time.";
  }

  const executiveSummary = `${p1}\n\n${p2}\n\n${p3}`;

  // Structured Decisions
  const keyDecisions =
    decisions.length > 0
      ? decisions.map((d) => ({
          decision: d.text,
          context: d.metadata?.sourceQuote || "Ratified by team consensus on the visual canvas",
          owner: d.metadata?.assignee || "Team Consensus",
        }))
      : [
          {
            decision: "Alignment on active canvas layout and sprint direction",
            context: "Agreed through collaborative canvas interaction",
            owner: "Team Consensus",
          },
        ];

  // Structured Action Items
  const actionItems =
    tasks.length > 0
      ? tasks.map((t) => ({
          task: t.text,
          assignee: t.metadata?.assignee || "Unassigned",
          priority: t.metadata?.priority || "medium",
          deadline: t.metadata?.deadline || "Next Sprint",
          completed: !!t.metadata?.completed,
        }))
      : [
          {
            task: "Review and refine initial meeting visual graph",
            assignee: "Team",
            priority: "medium",
            deadline: "Next Sprint",
            completed: false,
          },
        ];

  // Structured Unresolved Questions
  const unresolvedQuestions =
    openItems.length > 0
      ? openItems.map((q) => ({
          question: q.text,
          blockerFor: q.type === "risk" ? "Project Timeline / Architecture" : "Decision Clarification",
          suggestedFollowup: "Schedule follow-up review or explore during next sync",
        }))
      : [];

  // Tags
  const tags = Array.from(
    new Set([
      roomMode,
      "synthesis",
      ...nodes.map((n) => n.type),
      ...(tasks.length > 0 ? ["action-plan"] : []),
      ...(decisions.length > 0 ? ["decisions-ratified"] : []),
    ])
  ).slice(0, 5);

  return {
    executiveSummary,
    keyDecisions,
    actionItems,
    unresolvedQuestions,
    tags,
    provider: "deterministic-fallback",
    model: "canvas-graph-synthesizer",
  };
}

/**
 * Orchestrates dual-source meeting summarization with fallback and schema validation
 */
export async function generateMeetingSummary({
  roomId,
  transcripts = [],
  nodes = [],
  edges = [],
  roomMode = "operational",
} = {}) {
  try {
    const rawResult = await withFallback("summarizeMeeting", {
      transcripts,
      nodes,
      edges,
      roomMode,
    });

    if (rawResult && rawResult.executiveSummary && Array.isArray(rawResult.actionItems)) {
      return {
        executiveSummary: String(rawResult.executiveSummary).trim(),
        keyDecisions: Array.isArray(rawResult.keyDecisions) ? rawResult.keyDecisions : [],
        actionItems: Array.isArray(rawResult.actionItems) ? rawResult.actionItems : [],
        unresolvedQuestions: Array.isArray(rawResult.unresolvedQuestions) ? rawResult.unresolvedQuestions : [],
        tags: Array.isArray(rawResult.tags) ? rawResult.tags : ["meeting", roomMode],
        provider: rawResult.provider || "ai",
        model: rawResult.model || "llama-3.3-70b",
      };
    }

    console.warn("[Summarization] LLM output missing required schema; switching to deterministic fallback.");
    return generateDeterministicSummary(nodes, edges, transcripts, roomMode);
  } catch (error) {
    console.error("[Summarization] AI providers failed; engaging high-fidelity deterministic fallback:", error.message);
    return generateDeterministicSummary(nodes, edges, transcripts, roomMode);
  }
}

/**
 * Converts a structured MeetingReport object into clean, formatted Markdown
 */
export function reportToMarkdown(report, { roomName = "mindMesh Session" } = {}) {
  if (!report) return "";

  const title = `# 📋 Meeting Report: ${roomName}\n\n`;
  const meta = `*Generated on: ${new Date().toLocaleString()}*  \n*Tags:* ${
    (report.tags || []).map((t) => `\`#${t}\``).join(" ") || "`#meeting`"
  }\n\n---\n\n`;

  const summary = `## 🎯 Executive Summary\n\n${report.executiveSummary || "No summary provided."}\n\n`;

  let decisions = "## 💡 Key Decisions\n\n";
  if (report.keyDecisions && report.keyDecisions.length > 0) {
    decisions += report.keyDecisions
      .map(
        (d, i) =>
          `### ${i + 1}. ${d.decision}\n- **Owner:** ${d.owner || "Team"}\n- **Context:** ${d.context || "Agreed upon during session"}`
      )
      .join("\n\n");
  } else {
    decisions += "_No explicit decisions recorded._";
  }
  decisions += "\n\n";

  let tasks = "## 🚀 Action Items\n\n";
  if (report.actionItems && report.actionItems.length > 0) {
    tasks += "| Status | Task | Assignee | Priority | Deadline |\n";
    tasks += "| :---: | :--- | :---: | :---: | :---: |\n";
    tasks += report.actionItems
      .map(
        (t) =>
          `| ${t.completed ? "✅" : "⬜"} | **${t.task}** | \`${t.assignee || "Unassigned"}\` | ${t.priority || "medium"} | ${t.deadline || "Next Sprint"} |`
      )
      .join("\n");
  } else {
    tasks += "_No action items generated._";
  }
  tasks += "\n\n";

  let questions = "## ❓ Unresolved Questions & Risks\n\n";
  if (report.unresolvedQuestions && report.unresolvedQuestions.length > 0) {
    questions += report.unresolvedQuestions
      .map(
        (q, i) =>
          `${i + 1}. **${q.question}**\n   - *Impact:* ${q.blockerFor || "Requires team review"}\n   - *Follow-up:* ${q.suggestedFollowup || "Follow up next sync"}`
      )
      .join("\n\n");
  } else {
    questions += "_All questions were resolved during the session._";
  }

  return `${title}${meta}${summary}${decisions}${tasks}${questions}\n`;
}

export const summarization = {
  generateMeetingSummary,
  generateDeterministicSummary,
  reportToMarkdown,
};

export default summarization;
