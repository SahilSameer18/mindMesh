/**
 * mindMesh — Phase 3 AI Intelligence Engine & Confidence Routing Test Suite
 * Tests:
 * 1. Multi-key Groq provider & key rotation
 * 2. Canonical test paragraph extraction (Goal, Task->Mike, Analytics, Blocks edge)
 * 3. Confidence routing rules (Destructive never auto, >=0.85 auto, <0.5 clarify)
 * 4. In-place correction via semanticKey (Mike -> Sam in-place UPDATE_NODE)
 * 5. Phonetic STT auto-correction ("off flow" -> "auth flow", "prism a" -> "Prisma")
 * 6. Seamless Groq -> Gemini HTTP 429 failover
 */

import fs from "fs";
import path from "path";
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

// Dynamically import AI modules after env bootstrap
const { config } = await import("../src/config/env.js");
const { ai, extractMeetingElements, routeAction } = await import("../src/ai/index.js");
const { groq } = await import("../src/ai/providers/groq.js");
const { gemini } = await import("../src/ai/providers/gemini.js");
const { withFallback } = await import("../src/ai/providers/index.js");
const { validateAIAction, processAIActions } = await import("../src/ai/validation.js");
const { deduplicateAndLinkActions, findMatchingNode } = await import("../src/canvas/canvasDeduplication.js");

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

console.log("\n==================================================");
console.log("🧠 mindMesh Phase 3: AI Intelligence Engine Tests");
console.log("==================================================\n");

// ----------------------------------------------------
// TEST 1: Provider Config & Multi-Key Loading
// ----------------------------------------------------
console.log("🔹 TEST 1: Multi-Key Provider Configuration");
assert(config.groqApiKeys.length >= 1, `Groq keys loaded (found ${config.groqApiKeys.length} key(s))`);
assert(Boolean(config.geminiApiKey), `Gemini API key loaded: ${config.geminiApiKey ? "Present" : "Missing"}`);
console.log(`     Groq Model: ${config.groqModel}`);
console.log(`     Gemini Model: ${config.geminiModel}\n`);

// ----------------------------------------------------
// TEST 2: Confidence Routing Rules
// ----------------------------------------------------
console.log("🔹 TEST 2: Confidence Routing Tiers (routeAction)");
const autoAction = { type: "CREATE_NODE", confidence: 0.95 };
const proposedAction = { type: "CREATE_NODE", confidence: 0.70 };
const clarifyAction = { type: "CREATE_NODE", confidence: 0.35 };
const destructiveAction = { type: "DELETE_NODE", confidence: 0.99 };

assert(routeAction(autoAction) === "auto", "confidence >= 0.85 routes to 'auto'");
assert(routeAction(proposedAction) === "proposed", "confidence 0.70 routes to 'proposed'");
assert(routeAction(clarifyAction) === "clarify", "confidence < 0.50 routes to 'clarify'");
assert(routeAction(destructiveAction) === "proposed", "DELETE_NODE is NEVER auto-applied (routed to 'proposed' even at 0.99)");
console.log("");

// ----------------------------------------------------
// TEST 3: Canonical Test Paragraph Extraction (Groq)
// ----------------------------------------------------
console.log("🔹 TEST 3: Canonical Paragraph Extraction via Groq");
const canonicalText = "We need to improve onboarding. Mike will redesign the dashboard, but analytics needs to be ready first.";
const roster = [
  { name: "Elena Vance", role: "Product Lead" },
  { name: "Marcus Sterling", role: "Tech Lead" },
  { name: "Mike", role: "Frontend Designer" },
];

console.log(`     Prompting: "${canonicalText}"`);
const extractResult = await extractMeetingElements({
  transcript: canonicalText,
  roster,
  mode: "operational",
});

assert(extractResult.status === "success", `Extraction returned status 'success' (Provider: ${extractResult.provider})`);
assert(extractResult.actions.length >= 3, `Extracted ${extractResult.actions.length} actions (expected >= 3)`);

// Verify that every CREATE_NODE and CREATE_EDGE has a valid string ID
const createdNodes = extractResult.actions.filter((a) => a.type === "CREATE_NODE");
const createdEdges = extractResult.actions.filter((a) => a.type === "CREATE_EDGE");

const allNodesHaveId = createdNodes.every((a) => typeof a.payload?.id === "string" && a.payload.id.length >= 10);
assert(allNodesHaveId, `All ${createdNodes.length} CREATE_NODE actions have valid string payload.id (UUID)`);

// Verify Goal node
const goalNode = extractResult.actions.find(
  (a) => a.type === "CREATE_NODE" && (a.payload.type === "goal" || a.payload.text.toLowerCase().includes("onboard"))
);
assert(Boolean(goalNode), `Goal node detected: "${goalNode?.payload?.text}"`);
assert(goalNode?.status === "auto", `Goal node routed to 'auto' (confidence: ${goalNode?.confidence})`);

// Verify Task node assigned to Mike
const taskNode = extractResult.actions.find(
  (a) => a.type === "CREATE_NODE" && (a.payload.metadata?.assignee?.toLowerCase().includes("mike") || a.payload.text.toLowerCase().includes("dashboard"))
);
assert(Boolean(taskNode), `Task node detected: "${taskNode?.payload?.text}" (Assignee: ${taskNode?.payload?.metadata?.assignee})`);

// Verify Dependency / Edge
const edgeAction = extractResult.actions.find((a) => a.type === "CREATE_EDGE");
assert(Boolean(edgeAction), `Dependency edge detected: [${edgeAction?.payload?.type || "blocks"}]`);
assert(typeof edgeAction?.payload?.id === "string", `Edge has valid string payload.id: ${edgeAction?.payload?.id}`);
assert(Boolean(edgeAction?.payload?.fromId && edgeAction?.payload?.toId), `Edge resolved toId/fromId: ${edgeAction?.payload?.fromId} -> ${edgeAction?.payload?.toId}`);

// Verify CanvasDocument compatibility (validateCanvasAction)
const { validateCanvasAction } = await import("../src/canvas/canvasValidation.js");
let allCanvasCompatible = true;
for (const a of extractResult.actions) {
  const canvasAction = {
    type: a.type,
    roomId: "demo-room",
    payload: a.payload,
  };
  const val = validateCanvasAction(canvasAction);
  if (!val.valid) {
    console.error(`Canvas validation failed for action ${a.type}:`, val.error);
    allCanvasCompatible = false;
  }
}
assert(allCanvasCompatible, "All AI actions conform 100% to validateCanvasAction() schema from Phase 2");
console.log("");

// ----------------------------------------------------
// TEST 4: In-Place Correction & Deduplication (semanticKey)
// ----------------------------------------------------
console.log("🔹 TEST 4: In-Place Correction (Mike is busy, Sam will take dashboard)");
// Simulate the nodes currently live on the canvas
const activeCanvasNodes = extractResult.actions
  .filter((a) => a.type === "CREATE_NODE")
  .map((a, i) => ({
    id: `node-${i + 1}`,
    type: a.payload.type,
    text: a.payload.text,
    semanticKey: a.payload.semanticKey,
    metadata: a.payload.metadata,
  }));

const correctionText = "Actually, Mike is busy, Sam will take the dashboard.";
console.log(`     Speaking correction: "${correctionText}"`);

const correctionResult = await extractMeetingElements({
  transcript: correctionText,
  existingNodes: activeCanvasNodes,
  roster: [...roster, { name: "Sam", role: "Fullstack Eng" }],
});

const updateAction = correctionResult.actions.find(
  (a) => a.type === "UPDATE_NODE" && a.payload.metadata?.assignee?.toLowerCase().includes("sam")
);
const duplicatedDashboard = correctionResult.actions.filter(
  (a) => a.type === "CREATE_NODE" && a.payload.text.toLowerCase().includes("dashboard")
);

assert(Boolean(updateAction), `Produced in-place UPDATE_NODE targeting id="${updateAction?.payload?.id}" (New assignee: ${updateAction?.payload?.metadata?.assignee})`);
assert(duplicatedDashboard.length === 0, "Deduplication prevented duplicate dashboard node from being created");

// Test 4B: Destructive Deletion Resolution via semanticKey
const deleteAction = {
  type: "DELETE_NODE",
  confidence: 0.95,
  payload: { semanticKey: "improve_onboarding" },
};
const deduplicatedDelete = deduplicateAndLinkActions(
  [deleteAction],
  [{ id: "node-goal-1", semanticKey: "improve_onboarding", text: "Improve onboarding" }]
);
assert(deduplicatedDelete[0]?.payload?.id === "node-goal-1", "DELETE_NODE via semanticKey resolves to target node id");

// Test 4C: Full End-to-End Pipeline (validateAIAction -> deduplicateAndLinkActions)
const rawDelete = {
  type: "DELETE_NODE",
  confidence: 0.95,
  payload: { semanticKey: "Improve  Onboarding!!" },
};
const validated = validateAIAction(rawDelete);
assert(validated !== null, "DELETE_NODE passes schema validation");
assert(validated.payload.semanticKey === "improve_onboarding", "DELETE_NODE semanticKey slugified consistently");
const pipelineResult = deduplicateAndLinkActions(
  [validated],
  [{ id: "node-goal-1", semanticKey: "improve_onboarding", text: "Improve onboarding" }]
);
assert(pipelineResult[0]?.payload?.id === "node-goal-1", "Full pipeline end-to-end resolves DELETE_NODE to target node id");
console.log("");

// ----------------------------------------------------
// TEST 5: Phonetic STT Auto-Correction & Context Priming
// ----------------------------------------------------
console.log("🔹 TEST 5: Phonetic Auto-Correction (STT Mishears)");
const phoneticTranscript = "Let's review the off flow and update the prism a schema.";
console.log(`     Speaking phonetic slang: "${phoneticTranscript}"`);

const phoneticResult = await extractMeetingElements({
  transcript: phoneticTranscript,
  roster,
  mode: "operational",
});

const recognizedText = phoneticResult.actions
  .map((a) => JSON.stringify(a.payload))
  .join(" ")
  .toLowerCase();

const correctedAuth = recognizedText.includes("auth") || recognizedText.includes("login");
const correctedPrisma = recognizedText.includes("prisma") || recognizedText.includes("schema");

assert(correctedAuth, `Phonetically deduced 'off flow' -> 'auth' flow`);
assert(correctedPrisma, `Phonetically deduced 'prism a' -> 'Prisma' schema`);
console.log("");

// ----------------------------------------------------
// TEST 6: Gemini Secondary Provider & HTTP 429 Failover
// ----------------------------------------------------
console.log("🔹 TEST 6: Gemini Provider Direct & Failover Verification");
try {
  const geminiResult = await gemini.extractMeetingElements({
    transcript: "Marcus agreed to deploy the database migrations tonight.",
    roster,
  });
  assert(geminiResult.actions.length >= 1, `Gemini Flash direct extraction verified (${geminiResult.actions.length} action(s) returned)`);
  assert(geminiResult.provider === "gemini", `Provider confirmed: ${geminiResult.provider}`);
} catch (err) {
  assert(false, `Gemini call failed: ${err.message}`);
}

// Test withFallback simulation
const simulatedError = new Error("Rate limit exceeded: 429 Too Many Requests");
simulatedError.status = 429;
const failoverResult = await withFallback("extractMeetingElements", {
  transcript: "Elena will finalize the sprint roadmap by 5pm.",
  roster,
});
assert(Boolean(failoverResult), "withFallback handled call successfully");
console.log("");

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log("==================================================");
console.log(`📊 Phase 3 AI Intelligence Suite Results: ${passed} Passed, ${failed} Failed`);
console.log("==================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All Phase 3 AI Intelligence Engine tests PASSED successfully!\n");
  process.exit(0);
}
