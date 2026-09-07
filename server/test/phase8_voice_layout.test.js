/**
 * mindMesh — Phase 8 Sub-Phase 8A Backend Test Suite
 * Tests:
 * 1. Linear prerequisite chain (A -> B -> C => Ranks 0, 1, 2)
 * 2. Diamond dependency topological order (A -> B, A -> C, B -> D, C -> D => Rank(D) = 2)
 * 3. Circular dependency breaking via 3-color DFS (A -> B -> C -> A => terminates without error or NaN)
 * 4. Disconnected nodes semantic-type fallback (goal: 0, idea: 1, task: 2, decision: 3, risk: 4)
 * 5. Bounding-box non-overlap assertion (|xi - xj| >= 280 or |yi - yj| >= 140)
 * 6. Barycentric crossing minimization ordering
 * 7. Active Command Bar deterministic fast-path & AIAction persistence (/layout hierarchical, tidy architecture)
 */

import { computeHierarchicalLayout, computeLayout, createMoveActionsFromLayout } from "../src/canvas/canvasLayout.js";
import { executeWorkspaceCommand } from "../src/ai/commands.js";
import { getCanvasDocument } from "../src/canvas/canvasDocument.js";
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
console.log("🚀 mindMesh Sub-Phase 8A: Dagre Hierarchical Layout Tests");
console.log("========================================================\n");

async function runTests() {
  // ----------------------------------------------------
  // TEST 1: Linear Prerequisite Chain
  // ----------------------------------------------------
  console.log("--- Test 1: Linear Chain (A -> B -> C) ---");
  {
    const nodes = [
      { id: "node-a", type: "task", text: "Task A", x: 100, y: 100 },
      { id: "node-b", type: "task", text: "Task B", x: 200, y: 200 },
      { id: "node-c", type: "task", text: "Task C", x: 300, y: 300 },
    ];
    const edges = [
      { id: "e1", fromId: "node-a", toId: "node-b", type: "blocks" },
      { id: "e2", fromId: "node-b", toId: "node-c", type: "blocks" },
    ];

    const moves = computeHierarchicalLayout(nodes, edges);
    assert(moves.length === 3, "Returns movement coordinates for all 3 nodes");

    const map = new Map(moves.map((m) => [m.id, m]));
    const posA = map.get("node-a");
    const posB = map.get("node-b");
    const posC = map.get("node-c");

    assert(posA && posB && posC, "All nodes have coordinates");
    assert(posA.y < posB.y && posB.y < posC.y, "Strict vertical hierarchy: y(A) < y(B) < y(C)");
    assert(posB.y - posA.y === 200 && posC.y - posB.y === 200, "Ranks spaced exactly by 200px stride");
  }

  // ----------------------------------------------------
  // TEST 2: Diamond Dependency (Topological DP Order)
  // ----------------------------------------------------
  console.log("\n--- Test 2: Diamond Dependency (A -> B, A -> C, B -> D, C -> D) ---");
  {
    // A -> B and A -> C (blocks)
    // D depends_on B and D depends_on C (so B -> D and C -> D)
    const nodes = [
      { id: "diam-a", type: "goal", text: "Root Goal", x: 0, y: 0 },
      { id: "diam-b", type: "task", text: "Branch B", x: 0, y: 0 },
      { id: "diam-c", type: "task", text: "Branch C", x: 0, y: 0 },
      { id: "diam-d", type: "decision", text: "Merge D", x: 0, y: 0 },
    ];
    const edges = [
      { id: "e-ab", fromId: "diam-a", toId: "diam-b", type: "blocks" },
      { id: "e-ac", fromId: "diam-a", toId: "diam-c", type: "blocks" },
      { id: "e-db", fromId: "diam-d", toId: "diam-b", type: "depends_on" }, // depends_on => B precedes D
      { id: "e-dc", fromId: "diam-d", toId: "diam-c", type: "depends_on" }, // depends_on => C precedes D
    ];

    const moves = computeHierarchicalLayout(nodes, edges);
    const map = new Map(moves.map((m) => [m.id, m]));

    const posA = map.get("diam-a");
    const posB = map.get("diam-b");
    const posC = map.get("diam-c");
    const posD = map.get("diam-d");

    assert(posA.y === 40, "Root node A is placed at rank 0 (y = 40)");
    assert(posB.y === 240 && posC.y === 240, "Parallel nodes B and C are placed at rank 1 (y = 240)");
    assert(posD.y === 440, "Diamond sink D is placed at rank 2 (y = 440), not prematurely evaluated at rank 1");
    assert(Math.abs(posB.x - posC.x) >= 360, "Parallel nodes B and C are horizontally separated by COL_STRIDE (>= 360px)");
  }

  // ----------------------------------------------------
  // TEST 3: Circular Dependency Breaking (3-Color DFS)
  // ----------------------------------------------------
  console.log("\n--- Test 3: Circular Dependency Resilience (A -> B -> C -> A) ---");
  {
    const nodes = [
      { id: "cyc-a", type: "idea", text: "Cycle A", x: 0, y: 0 },
      { id: "cyc-b", type: "idea", text: "Cycle B", x: 0, y: 0 },
      { id: "cyc-c", type: "idea", text: "Cycle C", x: 0, y: 0 },
    ];
    const edges = [
      { id: "e-ab", fromId: "cyc-a", toId: "cyc-b", type: "blocks" },
      { id: "e-bc", fromId: "cyc-b", toId: "cyc-c", type: "blocks" },
      { id: "e-ca", fromId: "cyc-c", toId: "cyc-a", type: "blocks" }, // Back-edge forming cycle!
    ];

    const moves = computeHierarchicalLayout(nodes, edges);
    assert(moves.length === 3, "Completed without infinite loop or stack overflow");

    for (const m of moves) {
      assert(Number.isFinite(m.x) && !Number.isNaN(m.x), `Node ${m.id} has finite X: ${m.x}`);
      assert(Number.isFinite(m.y) && !Number.isNaN(m.y), `Node ${m.id} has finite Y: ${m.y}`);
    }
  }

  // ----------------------------------------------------
  // TEST 4: Semantic Type Fallback for Disconnected Nodes
  // ----------------------------------------------------
  console.log("\n--- Test 4: Disconnected Nodes Semantic Fallback ---");
  {
    const nodes = [
      { id: "disc-risk", type: "risk", text: "Security Vulnerability" },
      { id: "disc-goal", type: "goal", text: "Launch v1" },
      { id: "disc-task", type: "task", text: "Write Unit Tests" },
      { id: "disc-idea", type: "idea", text: "Smart Caching" },
      { id: "disc-dec", type: "decision", text: "Use Postgres" },
    ];
    // No edges passed — completely disconnected nodes
    const moves = computeHierarchicalLayout(nodes, []);
    const map = new Map(moves.map((m) => [m.id, m]));

    const yGoal = map.get("disc-goal").y;
    const yIdea = map.get("disc-idea").y;
    const yTask = map.get("disc-task").y;
    const yDec = map.get("disc-dec").y;
    const yRisk = map.get("disc-risk").y;

    assert(yGoal === 40, "Disconnected goal falls back to Rank 0 (y = 40)");
    assert(yIdea === 240, "Disconnected idea falls back to Rank 1 (y = 240)");
    assert(yTask === 440, "Disconnected task falls back to Rank 2 (y = 440)");
    assert(yDec === 640, "Disconnected decision falls back to Rank 3 (y = 640)");
    assert(yRisk === 840, "Disconnected risk falls back to Rank 4 (y = 840)");
    assert(
      yGoal < yIdea && yIdea < yTask && yTask < yDec && yDec < yRisk,
      "Strict semantic rank ordering: Goal < Idea < Task < Decision < Risk"
    );
  }

  // ----------------------------------------------------
  // TEST 5: Collision-Free Bounding Box Non-Overlap
  // ----------------------------------------------------
  console.log("\n--- Test 5: Bounding Box Non-Overlap (|dx| >= 280 OR |dy| >= 140) ---");
  {
    // Generate a complex semi-connected graph with 12 nodes
    const complexNodes = [];
    const types = ["goal", "task", "idea", "decision", "risk", "question"];
    for (let i = 0; i < 12; i++) {
      complexNodes.push({
        id: `node-${i}`,
        type: types[i % types.length],
        text: `Complex Node ${i}`,
        x: Math.random() * 800,
        y: Math.random() * 600,
      });
    }

    const complexEdges = [
      { id: "ce1", fromId: "node-0", toId: "node-1", type: "blocks" },
      { id: "ce2", fromId: "node-0", toId: "node-2", type: "blocks" },
      { id: "ce3", fromId: "node-1", toId: "node-3", type: "blocks" },
      { id: "ce4", fromId: "node-2", toId: "node-3", type: "blocks" },
      { id: "ce5", fromId: "node-3", toId: "node-4", type: "leads_to" },
      { id: "ce6", fromId: "node-5", toId: "node-4", type: "part_of" },
      { id: "ce7", fromId: "node-6", toId: "node-7", type: "blocks" },
    ];

    const moves = computeHierarchicalLayout(complexNodes, complexEdges);
    let violations = 0;

    for (let i = 0; i < moves.length; i++) {
      for (let j = i + 1; j < moves.length; j++) {
        const dx = Math.abs(moves[i].x - moves[j].x);
        const dy = Math.abs(moves[i].y - moves[j].y);

        // Card width is 280, height is 140. Non-overlap means dx >= 280 OR dy >= 140
        const noOverlap = dx >= 280 || dy >= 140;
        if (!noOverlap) {
          violations++;
          console.error(`  Collision violation between ${moves[i].id} and ${moves[j].id}: dx=${dx}, dy=${dy}`);
        }
      }
    }

    assert(violations === 0, `All 66 pairwise node comparisons are collision-free (0 overlaps found)`);
  }

  // ----------------------------------------------------
  // TEST 6: Barycenter Crossing Minimization
  // ----------------------------------------------------
  console.log("\n--- Test 6: Barycentric Crossing Minimization ---");
  {
    // Parent 1 (left) blocks Child 1
    // Parent 2 (right) blocks Child 2
    // Even if initial order of children in array is reversed [Child 2, Child 1],
    // barycentric ordering must place Child 1 to the left of Child 2
    const nodes = [
      { id: "p1", type: "goal", text: "Parent Left", x: 100, y: 40 },
      { id: "p2", type: "goal", text: "Parent Right", x: 800, y: 40 },
      { id: "c2", type: "task", text: "Child Right", x: 0, y: 0 },
      { id: "c1", type: "task", text: "Child Left", x: 0, y: 0 },
    ];
    const edges = [
      { id: "e-p1-c1", fromId: "p1", toId: "c1", type: "blocks" },
      { id: "e-p2-c2", fromId: "p2", toId: "c2", type: "blocks" },
    ];

    const moves = computeHierarchicalLayout(nodes, edges);
    const map = new Map(moves.map((m) => [m.id, m]));

    const c1 = map.get("c1");
    const c2 = map.get("c2");

    assert(c1.x < c2.x, `Child 1 (x=${c1.x}) correctly placed to the left of Child 2 (x=${c2.x}) by barycenter heuristic`);
  }

  // ----------------------------------------------------
  // TEST 7: Active Command Bar Routing & AIAction Linage
  // ----------------------------------------------------
  console.log("\n--- Test 7: Active Command Bar (/layout hierarchical & tidy architecture) ---");
  {
    const TEST_ROOM = "demo-room";
    const doc = await getCanvasDocument(TEST_ROOM);

    // Setup 3 nodes in canvas document
    await doc.applyAction({
      type: "CREATE_NODE",
      roomId: TEST_ROOM,
      payload: { id: "cmd-node-1", text: "Phase 1: Architecture", type: "goal", x: 50, y: 50 },
    });
    await doc.applyAction({
      type: "CREATE_NODE",
      roomId: TEST_ROOM,
      payload: { id: "cmd-node-2", text: "Phase 2: Database", type: "task", x: 50, y: 250 },
    });
    await doc.applyAction({
      type: "CREATE_EDGE",
      roomId: TEST_ROOM,
      payload: { id: "cmd-edge-1", fromId: "cmd-node-1", toId: "cmd-node-2", type: "blocks" },
    });

    // Subtest 7A: Slash command fast-path
    const slashRes = await executeWorkspaceCommand({
      roomId: TEST_ROOM,
      prompt: "/layout hierarchical",
      canvasDoc: doc,
      userId: "user-elena",
    });

    assert(slashRes.status === "success", "executeWorkspaceCommand executes /layout hierarchical with status: success");
    assert(slashRes.intent === "REORGANIZE_LAYOUT", "Intent is REORGANIZE_LAYOUT");
    assert(slashRes.layoutType === "hierarchical", "Layout type is hierarchical");
    assert(slashRes.actions.length >= 2, "Emitted MOVE_NODE actions for canvas nodes");
    assert(slashRes.provider === "deterministic", "Provider is deterministic (zero LLM hallucination)");

    // Subtest 7B: Natural language phrase
    const nlRes = await executeWorkspaceCommand({
      roomId: TEST_ROOM,
      prompt: "tidy architecture",
      canvasDoc: doc,
      userId: "user-marcus",
    });

    assert(nlRes.status === "success", "Natural language 'tidy architecture' executes successfully");
    assert(nlRes.layoutType === "hierarchical", "Routes to hierarchical layout");
    assert(nlRes.actions.every((a) => a.type === "MOVE_NODE"), "Every action produced is a valid MOVE_NODE action");

    // Subtest 7C: Punctuation and whitespace tolerance
    const punctRes = await executeWorkspaceCommand({
      roomId: TEST_ROOM,
      prompt: "  /layout   hierarchical.  ",
      canvasDoc: doc,
      userId: "user-elena",
    });
    assert(punctRes.provider === "deterministic", "Multi-space and trailing period '/layout   hierarchical.' routed to deterministic fast-path");
    assert(punctRes.layoutType === "hierarchical", "Normalized layoutType is hierarchical");

    // Verify coordinates updated in CanvasDocument
    const state = doc.getState();
    const node1 = state.nodes.find((n) => n.id === "cmd-node-1");
    const node2 = state.nodes.find((n) => n.id === "cmd-node-2");

    assert(node1.y < node2.y, "CanvasDocument state reflects authoritative Dagre coordinates: node1.y < node2.y");

    // Verify AIAction record created in database
    const savedActions = await prisma.aIAction.findMany({
      where: { roomId: TEST_ROOM },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    assert(savedActions.length > 0, "AIAction records persisted to Neon PostgreSQL");
    assert(savedActions[0].type === "MOVE_NODE", "Persisted action type is MOVE_NODE");
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
