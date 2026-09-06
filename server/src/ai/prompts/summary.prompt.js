/**
 * mindMesh — Dual-Source Meeting Commit Prompt
 * Synthesizes chronological dialogue transcripts and authoritative canvas entities
 * into an executive meeting report with decisions, action items, and open questions.
 */

export function buildMeetingCommitPrompt({
  transcripts = [],
  nodes = [],
  edges = [],
  roomMode = "operational",
} = {}) {
  // Format Transcripts
  const formattedTranscripts =
    transcripts.length > 0
      ? transcripts
          .map((t) => {
            const time = t.createdAt
              ? new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "00:00";
            return `[${time}] ${t.speaker || "Participant"}: "${t.text}"`;
          })
          .join("\n")
      : "(No spoken dialogue recorded for this session)";

  // Format Canvas Nodes by Type
  const nodesByType = {
    goal: [],
    decision: [],
    task: [],
    question: [],
    risk: [],
    idea: [],
    image: [],
    person: [],
  };

  for (const node of nodes) {
    const t = node.type?.toLowerCase() || "idea";
    if (!nodesByType[t]) nodesByType[t] = [];
    nodesByType[t].push(node);
  }

  const formatNodeList = (list) => {
    if (!list || list.length === 0) return "None";
    return list
      .map((n) => {
        let details = `• "${n.text}"`;
        if (n.metadata?.assignee) details += ` [Assignee: ${n.metadata.assignee}]`;
        if (n.metadata?.priority) details += ` [Priority: ${n.metadata.priority}]`;
        if (n.metadata?.status) details += ` [Status: ${n.metadata.status}]`;
        if (n.metadata?.sourceQuote) details += ` (Context: "${n.metadata.sourceQuote}")`;
        return details;
      })
      .join("\n");
  };

  const formattedNodes = `
Active Canvas Entities:
Goals:
${formatNodeList(nodesByType.goal)}

Decisions Made:
${formatNodeList(nodesByType.decision)}

Action Items / Tasks:
${formatNodeList(nodesByType.task)}

Open Questions:
${formatNodeList(nodesByType.question)}

Identified Risks:
${formatNodeList(nodesByType.risk)}

Key Ideas & Concepts:
${formatNodeList(nodesByType.idea)}
`.trim();

  // Format Canvas Edges (Dependencies)
  const nodeMap = new Map(nodes.map((n) => [n.id, n.text]));
  const formattedEdges =
    edges.length > 0
      ? edges
          .map((e) => {
            const fromText = nodeMap.get(e.fromId) || e.fromId;
            const toText = nodeMap.get(e.toId) || e.toId;
            return `• "${fromText}" --[${e.type || e.label || "relates_to"}]--> "${toText}"`;
          })
          .join("\n")
      : "No explicit dependency edges defined.";

  return `
You are the authoritative Chief of Staff and AI Synthesis Engine for mindMesh, an executive collaborative workspace.
Your mission is to synthesize the following meeting into an authoritative, beautifully structured Meeting Report.

=== CRITICAL DUAL-SOURCE TRUTH HIERARCHY ===
1. CANVAS STATE IS AUTHORITATIVE FINAL TRUTH:
   - The active canvas nodes and dependency edges represent the team's SURVIVING CONSENSUS at the end of the meeting.
   - If a topic or idea was discussed in the dialogue transcripts but is ABSENT from the canvas (or was deleted/superseded during debate), treat it as superseded, abandoned, or exploratory.
   - Never elevate a discarded spoken remark above an active canvas Decision or Task.
2. DIALOGUE TRANSCRIPTS ARE NARRATIVE & CONTEXTUAL HISTORY:
   - Use the transcripts to provide debate nuance, speaker quotes, rationale, and context for the active items reflected on the canvas.
   - Match spoken commitments to canvas tasks to verify ownership and deadlines.
3. MEETING MODE CONTEXT:
   - Current mode is "${roomMode}". ${
     roomMode === "brainstorm"
       ? "Adopt a forward-looking, creative, and exploratory synthesis tone focusing on emergent concepts."
       : "Adopt a concise, structured, execution-oriented executive tone focused on clear milestones and accountability."
   }

=== INPUT CONTEXT ===

${formattedNodes}

Canvas Relational Dependencies:
${formattedEdges}

Chronological Dialogue Transcript:
${formattedTranscripts}

=== OUTPUT FORMAT REQUIREMENTS ===
Return ONLY a valid, parseable JSON object matching this exact schema:
{
  "executiveSummary": "A cohesive 2-3 paragraph executive synthesis summarizing what was accomplished, key strategic themes, and overall momentum.",
  "keyDecisions": [
    {
      "decision": "Clear statement of the decision ratified",
      "context": "Why this decision was made based on debate and canvas nodes",
      "owner": "Name of responsible leader or 'Team Consensus'"
    }
  ],
  "actionItems": [
    {
      "task": "Concrete, actionable task description",
      "assignee": "Name of assignee or 'Unassigned'",
      "priority": "high | medium | low",
      "deadline": "Stated deadline or 'Next Sprint'"
    }
  ],
  "unresolvedQuestions": [
    {
      "question": "Unanswered question or identified risk",
      "blockerFor": "What execution item this blocks or impacts",
      "suggestedFollowup": "Recommended next step to resolve"
    }
  ],
  "tags": ["3-5 high-level topic tags"]
}

Do not include markdown formatting code blocks (e.g. \`\`\`json). Return raw valid JSON.
`.trim();
}
