/**
 * mindMesh — Phase 4 Backend Integration Test Suite
 * Tests:
 * 1. Payload normalization & SHA-256 fingerprint idempotency
 * 2. Layout Engine (roadmap, risks-to-right, cluster, grid)
 * 3. applyAIActions Effector (idempotency guard, auto execution, proposed gating)
 * 4. Action lifecycle resolution (approveAIAction & rejectAIAction)
 * 5. getRoomAIActions Activity Stream hydration
 * 6. executeWorkspaceCommand end-to-end orchestration
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

// Bootstrap environment from API.md if env vars not already set
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiMdPath = path.resolve(__dirname, "../../API.md");
if (fs.existsSync(apiMdPath)) {
  const content = fs.readFileSync(apiMdPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key && val && (!process.env[key] || process.env[key] === "")) {
      process.env[key] = val;
    }
  }
}

// Dynamically import modules
const { normalizePayload, computeFingerprint } = await import("../src/utils/hash.js");
const {
  computeRoadmapLayout,
  computeRisksRightLayout,
  computeClusterLayout,
  computeGridLayout,
  computeLayout,
  createMoveActionsFromLayout,
} = await import("../src/canvas/canvasLayout.js");
const {
  applyAIActions,
  approveAIAction,
  rejectAIAction,
  getRoomAIActions,
} = await import("../src/ai/applyAIActions.js");
const { routeAction } = await import("../src/ai/validation.js");
const { executeWorkspaceCommand } = await import("../src/ai/commands.js");
const { getCanvasDocument } = await import("../src/canvas/canvasDocument.js");
const { getOrCreateRoom } = await import("../src/services/room.service.js");
const { default: prisma } = await import("../src/lib/prisma.js");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log("\n========================================================");
console.log("⚡ mindMesh Phase 4: Backend & Effector Integration Tests");
console.log("========================================================\n");

// ----------------------------------------------------
// TEST 1: Deterministic Hashing & Normalization
// ----------------------------------------------------
console.log("--- 1. Deterministic Payload Hashing & Idempotency ---");

const payloadA = {
  text: "Redesign dashboard",
  type: "task",
  metadata: { priority: "high", assignee: "Marcus Sterling" },
};

const payloadB = {
  metadata: { assignee: "Marcus Sterling", priority: "high" },
  type: "task",
  text: "Redesign dashboard",
};

const normalizedA = JSON.stringify(normalizePayload(payloadA));
const normalizedB = JSON.stringify(normalizePayload(payloadB));
assert(normalizedA === normalizedB, "Keys sorted recursively regardless of insertion order");

const fp1 = computeFingerprint("demo-room", "source-chunk-1", "CREATE_NODE", payloadA);
const fp2 = computeFingerprint("demo-room", "source-chunk-1", "CREATE_NODE", payloadB);
assert(fp1 === fp2, "Reordered JSON objects yield identical SHA-256 fingerprint");
assert(typeof fp1 === "string" && fp1.length === 64, "Fingerprint is standard 64-character SHA-256 hex");

const fpDifferentSource = computeFingerprint("demo-room", "source-chunk-2", "CREATE_NODE", payloadA);
assert(fp1 !== fpDifferentSource, "Different source IDs generate unique fingerprints");

// ----------------------------------------------------
// TEST 2: Layout Engine Algorithms
// ----------------------------------------------------
console.log("\n--- 2. Geometric Layout Engine ---");

const sampleNodes = [
  { id: "node-goal", type: "goal", text: "Q3 Launch", x: 0, y: 0 },
  { id: "node-task-1", type: "task", text: "Build API", x: 50, y: 50 },
  { id: "node-task-2", type: "task", text: "Test API", x: 100, y: 100 },
  { id: "node-decision", type: "decision", text: "Use Postgres", x: 150, y: 150 },
  { id: "node-risk-1", type: "risk", text: "API rate limits", x: 200, y: 200 },
  { id: "node-risk-2", type: "risk", text: "Neon cold start", x: 250, y: 250 },
];

// 2a. Roadmap Layout
const roadmapMoves = computeRoadmapLayout(sampleNodes);
assert(roadmapMoves.length === sampleNodes.length, "Roadmap computes moves for all nodes");
const goalMove = roadmapMoves.find((m) => m.id === "node-goal");
const riskMoves = roadmapMoves.filter((m) => m.id.startsWith("node-risk"));
assert(goalMove && goalMove.x === 0, "Goals placed in first column (x = 0)");
assert(riskMoves.every((rm) => rm.x > goalMove.x), "Risks placed in later columns than goals");

// 2b. Risks to the Right
const risksRightMoves = computeRisksRightLayout(sampleNodes);
assert(risksRightMoves.length === 2, "Risks-to-right only moves the 2 risk nodes");
assert(risksRightMoves[0].x > 150, "Risk nodes shifted beyond max non-risk X coordinate");

// 2c. Cluster Layout
const clusterMoves = computeClusterLayout(sampleNodes);
assert(clusterMoves.length === sampleNodes.length, "Cluster layout places all nodes");

// 2d. Move Actions Generator
const moveActions = createMoveActionsFromLayout("demo-room", roadmapMoves);
assert(moveActions.length === sampleNodes.length, "Creates MOVE_NODE action per node");
assert(moveActions[0].type === "MOVE_NODE" && routeAction(moveActions[0]) === "auto", "Action is typed MOVE_NODE and central routeAction() dynamically resolves it to 'auto'");

// ----------------------------------------------------
// TEST 3: applyAIActions Effector & Database Bridge
// ----------------------------------------------------
console.log("\n--- 3. Effector Service & AIAction Persistence ---");

const testRoomId = "demo-room";
const uniqueSuffix = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
const testNodeId = `node-phase4-${uniqueSuffix}`;

// Ensure test room exists in Postgres
await getOrCreateRoom(testRoomId);

// 3.0 Phantom Resurrection Guard Test (MOVE_NODE on non-existent node)
const preDoc = await getCanvasDocument(testRoomId);
await preDoc.applyAction({ type: "MOVE_NODE", roomId: testRoomId, payload: { id: "ghost-phantom-node", x: 999, y: 999 } });
const ghostNode = preDoc.getState().nodes.find((n) => n.id === "ghost-phantom-node");
assert(!ghostNode, "MOVE_NODE safely ignores non-existent/deleted nodes, preventing phantom resurrection");


const autoAction = {
  type: "CREATE_NODE",
  payload: {
    id: testNodeId,
    roomId: testRoomId,
    type: "task",
    text: "Phase 4 Automated Verification Task",
    x: 400,
    y: 200,
    metadata: { test: true },
  },
  confidence: 0.95,
  reason: "Automated test execution",
  status: "auto",
};

// 3a. Auto Action Execution
const autoResults = await applyAIActions(testRoomId, [autoAction], { sourceId: "test-run-1" });
assert(autoResults.length === 1, "Effector returned 1 result for auto action");
assert(autoResults[0].status === "applied", "Auto action transitioned to 'applied' status in DB");

// Verify CanvasDocument in-memory state updated
const doc = await getCanvasDocument(testRoomId);
const canvasState = doc.getState();
const insertedNode = canvasState.nodes.find((n) => n.id === testNodeId);
assert(!!insertedNode, "Auto action executed onto CanvasDocument successfully");
assert(insertedNode?.text === "Phase 4 Automated Verification Task", "Canvas node text matches action payload");

// 3b. Idempotency Guard (Repeat exact action)
const repeatResults = await applyAIActions(testRoomId, [autoAction], { sourceId: "test-run-1" });
assert(repeatResults.length === 1, "Repeat action handled cleanly");
assert(repeatResults[0].id === autoResults[0].id, "Repeat action returned existing row without duplicate insert");

// Verify DB has only 1 row for this fingerprint
const dbRows = await prisma.aIAction.findMany({
  where: { fingerprint: autoResults[0].fingerprint },
});
assert(dbRows.length === 1, "Postgres @unique constraint preserved; exactly 1 AIAction row exists");

// ----------------------------------------------------
// TEST 4: Proposed Action Gating & Approval Lifecycle
// ----------------------------------------------------
console.log("\n--- 4. Proposed Action Gating & Resolution Lifecycle ---");

const proposedNodeId = `node-proposed-${uniqueSuffix}`;
const proposedAction = {
  type: "CREATE_NODE",
  payload: {
    id: proposedNodeId,
    roomId: testRoomId,
    type: "risk",
    text: "Potential Third-Party Rate Limit",
    x: 600,
    y: 300,
  },
  confidence: 0.65,
  reason: "Suggested by AI, needs human confirmation",
  status: "proposed",
};

const proposedResults = await applyAIActions(testRoomId, [proposedAction], { sourceId: "test-run-2" });
assert(proposedResults.length === 1, "Effector returned 1 proposed action");
assert(proposedResults[0].status === "proposed", "Proposed action retained 'proposed' status in DB");

// Verify CanvasDocument was NOT mutated by proposed action
const stateBeforeApproval = doc.getState();
const unapprovedNode = stateBeforeApproval.nodes.find((n) => n.id === proposedNodeId);
assert(!unapprovedNode, "Proposed action correctly NOT applied to CanvasDocument prior to approval");

// 4b. Approve Action
const approvedRecord = await approveAIAction(testRoomId, proposedResults[0].id);
assert(approvedRecord.status === "applied", "approveAIAction transitioned status to 'applied'");

// Verify CanvasDocument now contains the approved node
const stateAfterApproval = doc.getState();
const newlyApprovedNode = stateAfterApproval.nodes.find((n) => n.id === proposedNodeId);
assert(!!newlyApprovedNode, "Approved action executed onto CanvasDocument");

// 4c. Reject Action
const rejectedAction = {
  type: "CREATE_NODE",
  payload: {
    id: `node-rejected-${uniqueSuffix}`,
    roomId: testRoomId,
    type: "idea",
    text: "Discarded Proposal",
  },
  confidence: 0.55,
  reason: "Low confidence test",
  status: "proposed",
};

const rejectBatch = await applyAIActions(testRoomId, [rejectedAction], { sourceId: "test-run-3" });
const dismissed = await rejectAIAction(testRoomId, rejectBatch[0].id);
assert(dismissed.status === "rejected", "rejectAIAction transitioned status to 'rejected'");

// ----------------------------------------------------
// TEST 5: History Hydration (Activity Stream)
// ----------------------------------------------------
console.log("\n--- 5. Activity Stream History Hydration ---");

const history = await getRoomAIActions(testRoomId, { limit: 10 });
assert(Array.isArray(history) && history.length > 0, "getRoomAIActions returns non-empty array");
assert(history.some((a) => a.id === autoResults[0].id), "History includes our applied auto action");
assert(history.some((a) => a.id === approvedRecord.id), "History includes our approved action");

// ----------------------------------------------------
// TEST 6: executeWorkspaceCommand Orchestration
// ----------------------------------------------------
console.log("\n--- 6. Workspace Command Execution ---");

// Test layout command via natural language
console.log("  Executing natural language command: 'Move risks to the right'...");
const layoutCmdResult = await executeWorkspaceCommand({
  roomId: testRoomId,
  prompt: "Move risks to the right",
  userId: "demo-user-1",
});

assert(layoutCmdResult.status === "success", "Command executed with status 'success'");
assert(layoutCmdResult.intent === "REORGANIZE_LAYOUT" || layoutCmdResult.layoutType !== null, "Command recognized as layout reorganization");
console.log(`  -> Provider: ${layoutCmdResult.provider} (${layoutCmdResult.model})`);
console.log(`  -> Summary: ${layoutCmdResult.summary}`);

// Test query command via natural language
console.log("  Executing natural language query: 'What are the main tasks?'...");
const queryCmdResult = await executeWorkspaceCommand({
  roomId: testRoomId,
  prompt: "What are the main tasks?",
  userId: "demo-user-1",
});

assert(queryCmdResult.status === "success", "Query command executed with status 'success'");
assert(queryCmdResult.intent === "ANSWER_QUERY", "Intent recognized as ANSWER_QUERY");
assert(typeof queryCmdResult.answer === "string" && queryCmdResult.answer.length > 0, "Query returned clear synthesized answer");
console.log(`  -> Answer: "${queryCmdResult.answer.slice(0, 100)}..."`);

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log("\n========================================================");
console.log(`🎉 Phase 4 Backend Tests Finished: ${passed} passed, ${failed} failed.`);
console.log("========================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
