/**
 * mindMesh — Phase 7 Sub-Phase 7A Backend Test Suite
 * Tests:
 * 1. Pollinations.ai image URL builder & prompt enricher
 * 2. Two-phase /image command execution & AIAction evidence lineage
 * 3. UPDATE_NODE phantom node resurrection guard in CanvasDocument
 * 4. Dual-source meeting commit prompt compilation
 * 5. High-fidelity qualitative deterministic summary fallback
 * 6. Commit single-flight Promise sharing & 15s cooldown cache
 * 7. Neon PostgreSQL MeetingReport persistence & retrieval
 * 8. Room-scoped integration security & simulation dispatchers (Slack, Notion, Resend)
 */

import { generateImageUrl, formatConceptPrompt } from "../src/integrations/imageGen.js";
import { buildMeetingCommitPrompt } from "../src/ai/prompts/summary.prompt.js";
import { generateDeterministicSummary, generateMeetingSummary, reportToMarkdown } from "../src/ai/summarization.js";
import { executeWorkspaceCommand } from "../src/ai/commands.js";
import { getCanvasDocument } from "../src/canvas/canvasDocument.js";
import { aiService, commitMeeting, getMeetingReports, getLatestMeetingReport, exportMeetingReport } from "../src/services/ai.service.js";
import { buildSlackBlockKit, sendMeetingToSlack } from "../src/integrations/slack.js";
import { buildNotionPagePayload, sendMeetingToNotion } from "../src/integrations/notion.js";
import { buildMeetingEmailHtml, sendMeetingEmail } from "../src/integrations/email.js";
import prisma from "../src/lib/prisma.js";

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
console.log("🚀 mindMesh Sub-Phase 7A: Backend Commit & Visual Tests");
console.log("========================================================\n");

async function runTests() {
  const TEST_ROOM_ID = "demo-room";

  // ----------------------------------------------------
  // TEST 1: Pollinations.ai Image URL Builder & Prompt Enricher
  // ----------------------------------------------------
  console.log("--- Test 1: Pollinations.ai URL Builder & Enricher ---");
  {
    const enriched = formatConceptPrompt("distributed cache clustering");
    assert(
      enriched.includes("clean minimalist vector illustration") && enriched.includes("distributed cache clustering"),
      "formatConceptPrompt enriches raw concept with high-aesthetic styling keywords"
    );

    const longPrompt = "a".repeat(600);
    const url = generateImageUrl(longPrompt, { width: 1024, height: 768, seed: 42, model: "flux" });
    assert(url.startsWith("https://image.pollinations.ai/prompt/"), "generateImageUrl targets Pollinations Flux endpoint");
    assert(url.includes("width=1024") && url.includes("height=768") && url.includes("seed=42"), "Query parameters correctly embedded");
    assert(decodeURIComponent(url).length <= 550, "Length clamped to prevent HTTP 414 URI Too Long");
  }

  // ----------------------------------------------------
  // TEST 2: Two-Phase /image Command Flow & Evidence Lineage
  // ----------------------------------------------------
  console.log("\n--- Test 2: Two-Phase /image Command & AIAction Lineage ---");
  {
    const cmdResult = await executeWorkspaceCommand({
      roomId: TEST_ROOM_ID,
      prompt: "/image modern auth gateway architecture",
      userId: "demo-user-1",
    });

    assert(cmdResult.intent === "GENERATE_VISUAL", "Command recognized as GENERATE_VISUAL intent");
    assert(cmdResult.status === "success", "Command returned success status immediately");
    assert(cmdResult.actions.length > 0, "Dispatched immediate CREATE_NODE action through applyAIActions");

    const createdAction = cmdResult.actions[0];
    assert(createdAction.type === "CREATE_NODE", "Action is CREATE_NODE");
    assert(createdAction.payload.type === "image", "Node type is 'image'");
    assert(createdAction.payload.metadata?.status === "generating", "Node metadata starts in 'generating' state");
    assert(createdAction.id && createdAction.fingerprint, "AIAction persisted with deterministic fingerprint and UUID");

    // Check that CanvasNode in CanvasDocument has sourceId set (Evidence Lineage)
    const doc = await getCanvasDocument(TEST_ROOM_ID);
    const canvasNode = doc.nodes.get(createdAction.payload.id);
    assert(canvasNode && canvasNode.sourceId, "CanvasNode has sourceId referencing AIAction (Evidence Card lineage intact)");

    // Wait for Phase 2 async worker resolution (allowing for cloud database roundtrips)
    let resolvedNode = doc.nodes.get(createdAction.payload.id);
    for (let i = 0; i < 25; i++) {
      if (resolvedNode && resolvedNode.metadata?.status === "ready") break;
      await new Promise((resolve) => setTimeout(resolve, 100));
      resolvedNode = doc.nodes.get(createdAction.payload.id);
    }
    assert(
      resolvedNode && resolvedNode.metadata?.status === "ready" && resolvedNode.metadata?.imageUrl,
      "Phase 2 async worker dispatched UPDATE_NODE with status 'ready' and valid Pollinations URL"
    );
  }

  // ----------------------------------------------------
  // TEST 3: UPDATE_NODE Phantom Node Resurrection Guard
  // ----------------------------------------------------
  console.log("\n--- Test 3: UPDATE_NODE Phantom Node Resurrection Guard ---");
  {
    const doc = await getCanvasDocument(TEST_ROOM_ID);
    const ghostId = `ghost-${Date.now()}`;

    // Verify ghost node does not exist
    assert(!doc.nodes.has(ghostId), "Ghost node does not exist before update");

    // Attempt to update non-existent node
    await doc.applyAction({
      type: "UPDATE_NODE",
      roomId: TEST_ROOM_ID,
      payload: {
        id: ghostId,
        text: "Resurrected?",
        metadata: { status: "ready" },
      },
    }, { skipPersistence: true });

    assert(!doc.nodes.has(ghostId), "UPDATE_NODE defensively ignored missing node (No phantom resurrection)");
  }

  // ----------------------------------------------------
  // TEST 4: Dual-Source Meeting Commit Prompt Compilation
  // ----------------------------------------------------
  console.log("\n--- Test 4: Dual-Source Prompt Hierarchy & Compilation ---");
  {
    const sampleNodes = [
      { id: "g1", type: "goal", text: "Launch v1 prototype" },
      { id: "t1", type: "task", text: "Setup Neon database", metadata: { assignee: "Marcus", priority: "high" } },
      { id: "d1", type: "decision", text: "Use WebSocket relay for presence", metadata: { sourceQuote: "Elena agreed on socket approach" } },
      { id: "q1", type: "question", text: "How do we handle rate limits?" },
    ];
    const sampleEdges = [
      { fromId: "t1", toId: "g1", type: "blocks" },
    ];
    const sampleTranscripts = [
      { speaker: "Elena Vance", text: "We need to ensure the database can scale.", createdAt: new Date() },
      { speaker: "Marcus Sterling", text: "Neon serverless will handle auto-scaling.", createdAt: new Date() },
    ];

    const prompt = buildMeetingCommitPrompt({
      transcripts: sampleTranscripts,
      nodes: sampleNodes,
      edges: sampleEdges,
      roomMode: "operational",
    });

    assert(prompt.includes("CANVAS STATE IS AUTHORITATIVE FINAL TRUTH"), "Prompt instructs canvas-over-transcript truth hierarchy");
    assert(prompt.includes("DIALOGUE TRANSCRIPTS ARE NARRATIVE & CONTEXTUAL HISTORY"), "Prompt instructs transcript context role");
    assert(prompt.includes("Launch v1 prototype") && prompt.includes("Setup Neon database"), "Active canvas entities formatted into prompt");
    assert(prompt.includes("Elena Vance") && prompt.includes("Marcus Sterling"), "Dialogue transcript formatted with speakers");
  }

  // ----------------------------------------------------
  // TEST 5: Dedicated High-Fidelity Deterministic Fallback
  // ----------------------------------------------------
  console.log("\n--- Test 5: Dedicated High-Fidelity Deterministic Fallback ---");
  {
    const sampleNodes = [
      { id: "g1", type: "goal", text: "Complete Sprint 7 deliverables" },
      { id: "t1", type: "task", text: "Wire Slack Block Kit", metadata: { assignee: "Marcus", priority: "high" } },
      { id: "t2", type: "task", text: "Build Commit Modal", metadata: { assignee: "Elena", priority: "high" } },
      { id: "d1", type: "decision", text: "Use Promise-sharing for commit lock", metadata: { assignee: "Elena" } },
      { id: "r1", type: "risk", text: "Groq free quota rate ceiling" },
    ];
    const sampleEdges = [
      { fromId: "t1", toId: "t2", type: "depends_on" },
    ];

    const fallbackReport = generateDeterministicSummary(sampleNodes, sampleEdges, [], "operational");

    assert(typeof fallbackReport.executiveSummary === "string" && fallbackReport.executiveSummary.length > 100, "Fallback generates rich multi-paragraph executive summary");
    assert(fallbackReport.executiveSummary.includes("Complete Sprint 7 deliverables"), "Executive summary references actual goal card texts");
    assert(fallbackReport.keyDecisions.length === 1 && fallbackReport.keyDecisions[0].decision === "Use Promise-sharing for commit lock", "Key decisions populated from decision nodes");
    assert(fallbackReport.actionItems.length === 2 && fallbackReport.actionItems[0].assignee === "Marcus", "Action items populated from task nodes with assignees");
    assert(fallbackReport.unresolvedQuestions.length === 1 && fallbackReport.unresolvedQuestions[0].question === "Groq free quota rate ceiling", "Unresolved questions populated from risk cards");
    assert(fallbackReport.provider === "deterministic-fallback", "Provider tag indicates fallback execution");

    const markdown = reportToMarkdown(fallbackReport, { roomName: "Sprint 7 Review" });
    assert(markdown.includes("# 📋 Meeting Report: Sprint 7 Review") && markdown.includes("## 🎯 Executive Summary"), "reportToMarkdown renders formatted Markdown document");
  }

  // ----------------------------------------------------
  // TEST 6: Commit Single-Flight Promise Sharing & Cooldown
  // ----------------------------------------------------
  console.log("\n--- Test 6: Commit Promise Sharing & 15s Cooldown Cache ---");
  {
    // Concurrently trigger two commits for the same room
    const p1 = commitMeeting(TEST_ROOM_ID, { title: "Concurrent Test" });
    const p2 = commitMeeting(TEST_ROOM_ID, { title: "Concurrent Test" });

    const [r1, r2] = await Promise.all([p1, p2]);
    assert(r1 && r2, "Both concurrent commit requests resolved successfully");
    assert(r1.id === r2.id, "Both callers joined the exact same in-flight Promise and received identical report id (Promise Sharing)");

    // Follow-up commit within 15 seconds should return cached report
    const r3 = await commitMeeting(TEST_ROOM_ID, { title: "Cached Follow-up" });
    assert(r3.id === r1.id && r3.cached === true, "Third request within 15s resolved from cooldown cache (cached: true)");
  }

  // ----------------------------------------------------
  // TEST 7: Neon PostgreSQL Persistence & Report Querying
  // ----------------------------------------------------
  console.log("\n--- Test 7: Prisma Persistence & Report Querying ---");
  {
    const reports = await getMeetingReports(TEST_ROOM_ID);
    assert(Array.isArray(reports) && reports.length > 0, "getMeetingReports returns list of reports from Neon PostgreSQL");

    const latest = await getLatestMeetingReport(TEST_ROOM_ID);
    assert(latest && latest.id, "getLatestMeetingReport returns most recent report");
    assert(latest.executiveSummary && Array.isArray(latest.actionItems), "Stored JSON summary and tasks correctly unpacked");
  }

  // ----------------------------------------------------
  // TEST 8: Room-Scoped Integration Security & Dispatchers
  // ----------------------------------------------------
  console.log("\n--- Test 8: Integration Dispatchers & Simulation Guarantees ---");
  {
    const mockReport = {
      executiveSummary: "Team validated all Phase 7A contracts.",
      keyDecisions: [{ decision: "Ship Phase 7A", context: "All tests green", owner: "Team" }],
      actionItems: [{ task: "Build CommitCallModal", assignee: "Elena", priority: "high", completed: false }],
      unresolvedQuestions: [{ question: "Final video call styling", blockerFor: "Phase 8" }],
    };

    // Slack Simulation
    const slackRes = await sendMeetingToSlack("", mockReport, { roomName: "mindMesh Demo", roomId: TEST_ROOM_ID });
    assert(slackRes.success === true && slackRes.simulated === true, "Slack dispatcher executes in simulation mode when webhook is missing");
    assert(Array.isArray(slackRes.blocks) && slackRes.blocks.length >= 4, "Slack Block Kit payload constructed with headers, summary, and actions");

    // Notion Simulation
    const notionRes = await sendMeetingToNotion("", "", mockReport, { roomName: "mindMesh Demo" });
    assert(notionRes.success === true && notionRes.simulated === true, "Notion dispatcher executes in simulation mode when token/databaseId is missing");
    assert(Array.isArray(notionRes.payload.children), "Notion page payload constructed with callout and heading blocks");

    // Resend Email Simulation with HTML Escaping
    const maliciousReport = {
      ...mockReport,
      executiveSummary: "Discussion with <script>alert('xss')</script> & raw & chars.",
      keyDecisions: [{ decision: "Use <PostgreSQL> & Redis", context: "Context <test>", owner: "Team & Co" }],
    };
    const emailRes = await sendMeetingEmail("test@example.com", maliciousReport, { roomName: "mindMesh Demo & Test", roomId: TEST_ROOM_ID });
    assert(emailRes.success === true && emailRes.simulated === true, "Email dispatcher executes in simulation mode when API key is missing");
    assert(emailRes.html.includes("&lt;script&gt;") && !emailRes.html.includes("<script>alert"), "HTML email briefing safely escapes script tags in executive summary");
    assert(emailRes.html.includes("&lt;PostgreSQL&gt; &amp; Redis"), "HTML email briefing safely escapes brackets and ampersands in decisions");

    // Test RoomIntegration stored credential reading & non-destructive audit merge
    const testWebhook = "https://example.com/slack/webhook";
    await prisma.roomIntegration.deleteMany({ where: { roomId: TEST_ROOM_ID, provider: "slack" } });
    await prisma.roomIntegration.create({
      data: {
        roomId: TEST_ROOM_ID,
        provider: "slack",
        config: { webhookUrl: testWebhook, customTag: "pre-stored-field" },
      },
    });

    const latest = await getLatestMeetingReport(TEST_ROOM_ID);
    if (latest) {
      // Export without passing userConfig.webhookUrl — should use stored webhook from DB!
      const exportRes = await exportMeetingReport(TEST_ROOM_ID, latest.id, { provider: "slack" });
      assert(exportRes.success === true && exportRes.simulated === true, "exportMeetingReport executes simulation dispatch end-to-end");

      // Verify that after export, stored webhookUrl and customTag are preserved (not wiped out!)
      const updatedIntegration = await prisma.roomIntegration.findFirst({
        where: { roomId: TEST_ROOM_ID, provider: "slack" },
      });
      assert(
        updatedIntegration &&
        updatedIntegration.config.webhookUrl === testWebhook &&
        updatedIntegration.config.customTag === "pre-stored-field" &&
        updatedIntegration.config.lastExportAt,
        "exportMeetingReport preserves stored RoomIntegration credentials and merges audit log non-destructively"
      );

      // Export with provider: "email" without recipient — should default to team@mindmesh.local without error!
      const emailExportRes = await exportMeetingReport(TEST_ROOM_ID, latest.id, { provider: "email" });
      assert(emailExportRes.success === true && emailExportRes.simulated === true, "exportMeetingReport falls back to team@mindmesh.local when recipient omitted");
    }
  }

  console.log("\n========================================================");
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("❌ Test Suite Encountered Unhandled Error:", err);
  process.exit(1);
});
