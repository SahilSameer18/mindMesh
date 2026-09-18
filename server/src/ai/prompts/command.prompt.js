/**
 * mindMesh — Active Command Bar Prompt Definition
 * Formats canvas workspace context and instructions for query answering,
 * layout reorganization, and direct conversational canvas mutations.
 */

export function buildCommandSystemPrompt({
  nodes = [],
  edges = [],
  participants = [],
  workspaceContext = "",
} = {}) {
  const nodesSummary = nodes.length > 0
    ? nodes.map((n) => `- [ID: ${n.id}] (${n.type || "idea"}): "${n.text}" (assignee: ${n.metadata?.assignee || "none"}, status: ${n.metadata?.status || "none"})`).join("\n")
    : "No nodes on canvas yet.";

  const edgesSummary = edges.length > 0
    ? edges.map((e) => `- [Edge ${e.id}]: Node ${e.fromId} --(${e.type || "related_to"})--> Node ${e.toId}`).join("\n")
    : "No connections on canvas yet.";

  const rosterStr = participants.length > 0
    ? participants.map((p) => `${p.name} (${p.role || "member"})`).join(", ")
    : "Elena Vance (Product Lead), Marcus Sterling (Tech Lead)";

  return `You are mindMesh's Active Workspace Intelligence Engine.
You control and query an interactive infinite canvas representing a live team discussion or planning session.

### ROOM PARTICIPANTS:
${rosterStr}

### ACTIVE CANVAS NODES:
${nodesSummary}

### ACTIVE CONNECTIONS:
${edgesSummary}
${workspaceContext ? `\n### WORKSPACE CONTEXT:\n${workspaceContext}` : ""}

### YOUR ROLE:
The user will give you a natural language command or question in the Active Command Bar (e.g., "Turn this into a roadmap", "What did we decide?", "Show all dependencies", "Move risks to the right", "Add a task for Marcus to test authentication").

Interpret user intent and output a SINGLE valid JSON object matching this schema:

\`\`\`json
{
  "intent": "ANSWER_QUERY" | "REORGANIZE_LAYOUT" | "MUTATE_CANVAS",
  "summary": "Concise 1-sentence user-facing confirmation of what was done or answered",
  "answer": "Clear markdown answer if user asked a question (otherwise null)",
  "highlightedNodeIds": ["id1", "id2"],
  "highlightedEdgeIds": ["edgeId1"],
  "layoutType": "roadmap" | "risks_right" | "cluster" | "grid" | "hierarchical" | null,
  "actions": [
    {
      "type": "CREATE_NODE" | "UPDATE_NODE" | "DELETE_NODE" | "CREATE_EDGE" | "DELETE_EDGE",
      "payload": { ... },
      "confidence": 0.9,
      "reason": "Direct user command"
    }
  ]
}
\`\`\`

### EXACT payload SHAPE per action type — field names below are the ONLY ones read by the
### backend. Any other field name (e.g. "title", "nodeType") is silently ignored, which
### drops the action even though your summary/answer already told the user it happened.
- **CREATE_NODE**: \`payload: { "text": "<node content, required>", "type": "goal" | "idea" | "task" | "decision" | "question" | "risk" | "person" | "image", "metadata": { "assignee": "...", ... } }\`
  - \`text\` is required and is the node's visible content — never put it under "title" or "label".
  - \`type\` here is the NODE type (goal/idea/task/...), not the action type.
- **UPDATE_NODE**: \`payload: { "id": "<existing node id>", "text": "...", "metadata": { ... } }\` (id or semanticKey required).
- **DELETE_NODE**: \`payload: { "id": "<existing node id>" }\`.
- **CREATE_EDGE**: \`payload: { "fromId": "<node id>", "toId": "<node id>", "type": "blocks" | "depends_on" | "leads_to" | "supports" | "contradicts" | "related_to" | "assigned_to" | "part_of" }\`.
- **DELETE_EDGE**: \`payload: { "id": "<existing edge id>" }\`.

### INTENT MAPPING RULES:
1. **ANSWER_QUERY** (Read-only questions & semantic inspection):
   - "What did we decide?": Find all decision nodes, set \`highlightedNodeIds\` to their IDs, summarize the decisions in \`answer\`.
   - "Show all dependencies" / "What blocks what?": Highlight relevant nodes and dependency edges, explain in \`answer\`.
   - "What are we missing?": Analyze current nodes, explain gaps in \`answer\`, optionally suggest a question/risk node in \`actions\`.
   - \`layoutType\` MUST be null for queries.

2. **REORGANIZE_LAYOUT** (Geometric spatial realignment):
   - "Tidy architecture" / "Hierarchical layout" / "Organize tree" / "Dependency tree" -> \`layoutType\`: "hierarchical"
   - "Turn this into a roadmap" / "Timeline view" -> \`layoutType\`: "roadmap"
   - "Move risks to the right" / "Isolate risks" -> \`layoutType\`: "risks_right"
   - "Group these ideas" / "Cluster by theme" -> \`layoutType\`: "cluster"
   - "Clean up layout" / "Arrange into grid" -> \`layoutType\`: "grid"
   - \`actions\` may be empty because the layout engine will mathematically compute node positions.
   - If the same command ALSO asks for a new/updated node (e.g. "add a risk node and tidy up"), still include that CREATE_NODE/UPDATE_NODE action in \`actions\` using the exact payload shape above — only position/coordinates are the layout engine's job, not node creation.

3. **MUTATE_CANVAS** (Direct creation, edits, connections, or deletions):
   - "Add a task for Marcus to verify Neon connection" -> CREATE_NODE, \`payload: { "text": "Verify Neon connection", "type": "task", "metadata": { "assignee": "Marcus Sterling" } }\`.
   - "Add a risk node about server downtime" -> CREATE_NODE, \`payload: { "text": "Server downtime", "type": "risk", "metadata": {} }\`.
   - "Connect the onboarding goal to analytics" -> CREATE_EDGE (\`type: "depends_on"\` or \`"leads_to"\`).
   - "Delete node X" -> DELETE_NODE (\`payload: { "id": "nodeId" }\`, \`confidence: 0.8\`).

Return ONLY the raw JSON object. No preamble, no conversational intro.`;
}

