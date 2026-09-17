/**
 * mindMesh — Canvas Deduplication Unit Test Suite
 * Tests:
 * 1. findMatchingAgendaPillar returns the best fuzzy-matched pillar (regression for missing `return`)
 * 2. findMatchingAgendaPillar returns null when nothing clears the similarity threshold
 * 3. findMatchingAgendaPillar still honors an explicit matchedTopicKey
 * No DB, no network — pure function tests only.
 */

import { findMatchingAgendaPillar } from "../src/canvas/canvasDeduplication.js";

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
console.log("🧩 mindMesh: Canvas Deduplication Tests");
console.log("==================================================\n");

const pillars = [
  {
    id: "node-goal-auth",
    type: "goal",
    y: -150,
    semanticKey: "authentication_overhaul",
    text: "Authentication Overhaul",
    metadata: { isAgendaTopic: true, description: "Redesign login and session security" },
  },
  {
    id: "node-goal-analytics",
    type: "goal",
    y: -150,
    semanticKey: "analytics_pipeline",
    text: "Analytics Pipeline",
    metadata: { isAgendaTopic: true, description: "Event tracking and dashboards" },
  },
];

console.log("🔹 TEST 1: Fuzzy semantic match returns the correct pillar");
const fuzzyAction = {
  payload: { text: "Redesign the login session security flow", semanticKey: "redesign_login_flow" },
  reason: "Discussed as part of authentication overhaul",
};
const fuzzyMatch = findMatchingAgendaPillar(fuzzyAction, pillars);
assert(fuzzyMatch !== undefined, "does not return undefined (regression for missing `return bestPillar`)");
assert(fuzzyMatch?.id === "node-goal-auth", "fuzzy match resolves to the Authentication Overhaul pillar");

console.log("\n🔹 TEST 2: No thematic overlap returns null, not undefined");
const unrelatedAction = {
  payload: { text: "Order pizza for the team lunch", semanticKey: "order_pizza" },
  reason: "Casual aside",
};
const noMatch = findMatchingAgendaPillar(unrelatedAction, pillars);
assert(noMatch === null, "unrelated action returns null (not undefined) when no pillar clears the threshold");

console.log("\n🔹 TEST 3: Explicit matchedTopicKey still short-circuits to exact pillar");
const explicitAction = {
  payload: {
    text: "Set up event tracking",
    semanticKey: "setup_tracking",
    matchedTopicKey: "analytics_pipeline",
  },
};
const explicitMatch = findMatchingAgendaPillar(explicitAction, pillars);
assert(explicitMatch?.id === "node-goal-analytics", "explicit matchedTopicKey resolves to the Analytics Pipeline pillar");

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================\n");

if (failed > 0) {
  process.exit(1);
}
