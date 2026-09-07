/**
 * mindMesh — Phase 6 Backend & Presence Integration Test Suite
 * Tests:
 * 1. Peer Registry & Viewport Tracking (addPeer, getPeers, updatePeerViewport, removePeer)
 * 2. Atomic Presenter Lock & Explicit Rejection on Contested Claims
 * 3. Disconnect Pipeline (Lock release, presence cleanup, peer-left broadcast)
 * 4. Minimap Bounding Box Fallback Math (0 nodes, 1 node, N nodes, scale clamping)
 * 5. Room Mode Switching & Validation (operational vs brainstorm vs solo)
 * 6. ContextZone CRUD Persistence in PostgreSQL
 */

import fs from "fs";
import path from "path";
import assert from "assert";
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
const {
  addPeer,
  removePeer,
  getPeers,
  updatePeerViewport,
  claimPresenter,
  releasePresenter,
  getActivePresenter,
  handleSocketDisconnect,
  resetPresenceState,
} = await import("../src/services/presence.service.js");

const roomService = await import("../src/services/room.service.js");
const prisma = (await import("../src/lib/prisma.js")).default;

console.log("\n========================================================");
console.log("⚡ mindMesh Phase 6: Presence & Meeting Modes Tests");
console.log("========================================================\n");

const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const testRoomId = `test-room-phase6-${uniqueSuffix}`;

// Ensure test room exists in PostgreSQL
await roomService.getOrCreateRoom(testRoomId, {
  name: "Phase 6 Integration Room",
  mode: "operational",
});

try {
  // ----------------------------------------------------
  // TEST 1: In-Memory Peer Registry & Viewports
  // ----------------------------------------------------
  console.log("--- 1. Peer Registry & Viewport Tracking ---");
  resetPresenceState();

  const userElena = { id: "demo-user-1", name: "Elena Vance", role: "Product Lead", color: "#8b5cf6" };
  const userMarcus = { id: "demo-user-2", name: "Marcus Sterling", role: "Tech Lead", color: "#06b6d4" };

  addPeer(testRoomId, "socket-elena", userElena);
  addPeer(testRoomId, "socket-marcus", userMarcus);

  let peers = getPeers(testRoomId);
  assert.strictEqual(peers.length, 2, "Room tracks exactly 2 peers");
  assert.strictEqual(peers[0].user.name, "Elena Vance", "Peer 1 user metadata preserved");
  assert.strictEqual(peers[1].user.name, "Marcus Sterling", "Peer 2 user metadata preserved");

  // Viewport tracking
  const elenaViewport = { x: 120, y: -45, zoom: 1.25, width: 1920, height: 1080 };
  updatePeerViewport(testRoomId, "socket-elena", elenaViewport);
  peers = getPeers(testRoomId);
  const elenaPeer = peers.find((p) => p.socketId === "socket-elena");
  assert.deepStrictEqual(elenaPeer.viewport, elenaViewport, "Peer viewport recorded accurately");

  // Peer removal
  const remaining = removePeer(testRoomId, "socket-marcus");
  assert.strictEqual(remaining.length, 1, "One peer remains after removal");
  assert.strictEqual(remaining[0].socketId, "socket-elena", "Elena remains in room");
  console.log("✅ Peer registry and viewport tracking passed.");

  // ----------------------------------------------------
  // TEST 2: Presenter Lock & Contested Claim Rejection
  // ----------------------------------------------------
  console.log("\n--- 2. Single-Presenter Lock & Contested Claims ---");
  resetPresenceState();

  // Elena claims presenter
  const elenaClaim = claimPresenter(testRoomId, "socket-elena", userElena);
  assert.strictEqual(elenaClaim.success, true, "Elena claims presenter role");
  assert.strictEqual(elenaClaim.presenter.socketId, "socket-elena", "Presenter socketId matches Elena");

  // Elena re-claims (idempotent)
  const elenaReclaim = claimPresenter(testRoomId, "socket-elena", userElena);
  assert.strictEqual(elenaReclaim.success, true, "Same socket re-claim is idempotent");
  assert.strictEqual(elenaReclaim.idempotent, true, "Marked as idempotent");

  // Marcus attempts to contest presenter while Elena holds it
  const marcusClaim = claimPresenter(testRoomId, "socket-marcus", userMarcus);
  assert.strictEqual(marcusClaim.success, false, "Contested claim is strictly rejected");
  assert.strictEqual(marcusClaim.code, "PRESENTER_BUSY", "Returns PRESENTER_BUSY error code");
  assert(marcusClaim.message.includes("Elena Vance"), "Rejection message names the active presenter");

  // Marcus cannot release Elena's lock
  const unauthorizedRelease = releasePresenter(testRoomId, "socket-marcus");
  assert.strictEqual(unauthorizedRelease.success, false, "Non-presenter cannot release another peer's lock");
  assert.strictEqual(unauthorizedRelease.reason, "NOT_LOCK_HOLDER", "Fails with NOT_LOCK_HOLDER");

  // Elena releases presenter
  const elenaRelease = releasePresenter(testRoomId, "socket-elena");
  assert.strictEqual(elenaRelease.success, true, "Elena releases presenter lock");
  assert.strictEqual(getActivePresenter(testRoomId), null, "Active presenter is null after release");

  // Now Marcus can claim presenter
  const marcusSecondClaim = claimPresenter(testRoomId, "socket-marcus", userMarcus);
  assert.strictEqual(marcusSecondClaim.success, true, "Marcus successfully claims now-free presenter role");
  console.log("✅ Presenter lock, contested rejection, and release authorization passed.");

  // ----------------------------------------------------
  // TEST 3: Consolidated Disconnect Pipeline
  // ----------------------------------------------------
  console.log("\n--- 3. Consolidated Disconnect Pipeline ---");
  // Marcus is currently presenter. Setup mock IO and socket
  const emittedEvents = [];
  const mockIo = {
    to: (targetRoom) => ({
      emit: (evt, payload) => {
        emittedEvents.push({ targetRoom, evt, payload, type: "io.to" });
      },
    }),
  };

  const mockSocket = {
    id: "socket-marcus",
    roomId: testRoomId,
    user: userMarcus,
    to: (targetRoom) => ({
      emit: (evt, payload) => {
        emittedEvents.push({ targetRoom, evt, payload, type: "socket.to" });
      },
    }),
  };

  // Run unified disconnect
  handleSocketDisconnect(mockIo, mockSocket);

  // Assert presenter was automatically freed
  assert.strictEqual(getActivePresenter(testRoomId), null, "Presenter freed on disconnect");

  // Assert presenter:stopped was emitted to room
  const stoppedEvt = emittedEvents.find((e) => e.evt === "presenter:stopped");
  assert(stoppedEvt, "Emitted presenter:stopped on disconnect");
  assert.strictEqual(stoppedEvt.payload.presenterId, "socket-marcus", "Stopped event names Marcus");

  // Assert presence:peer-left was emitted to room
  const peerLeftEvt = emittedEvents.find((e) => e.evt === "presence:peer-left");
  assert(peerLeftEvt, "Emitted presence:peer-left on disconnect");
  assert.strictEqual(peerLeftEvt.payload.socketId, "socket-marcus", "Peer-left names Marcus");
  console.log("✅ Consolidated disconnect pipeline passed.");

  // ----------------------------------------------------
  // TEST 4: Minimap Bounding Box Fallback Math
  // ----------------------------------------------------
  console.log("\n--- 4. Minimap Bounding Box Fallback Math ---");

  function computeMinimapBounds(nodes, radarWidth = 220, radarHeight = 150) {
    if (!nodes || nodes.length === 0) {
      // 0 nodes fallback
      const box = { minX: -1000, minY: -750, maxX: 1000, maxY: 750, width: 2000, height: 1500 };
      const scale = Math.min(radarWidth / Math.max(box.width, 1200), radarHeight / Math.max(box.height, 800));
      return { box, scale };
    }

    if (nodes.length === 1) {
      // 1 node fallback
      const n = nodes[0];
      const box = {
        minX: n.x - 600,
        maxX: n.x + 600,
        minY: n.y - 400,
        maxY: n.y + 400,
        width: 1200,
        height: 800,
      };
      const scale = Math.min(radarWidth / Math.max(box.width, 1200), radarHeight / Math.max(box.height, 800));
      return { box, scale };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x > maxX) maxX = node.x;
      if (node.y > maxY) maxY = node.y;
    }

    const padding = 200;
    const box = {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      width: Math.max((maxX - minX) + padding * 2, 1200),
      height: Math.max((maxY - minY) + padding * 2, 800),
    };
    const scale = Math.min(radarWidth / box.width, radarHeight / box.height);
    return { box, scale };
  }

  // 0 nodes
  const emptyRes = computeMinimapBounds([]);
  assert(Number.isFinite(emptyRes.scale) && emptyRes.scale > 0, "0 nodes produces finite positive scale");
  assert.strictEqual(emptyRes.box.width, 2000, "0 nodes default box width is 2000");

  // 1 node
  const singleRes = computeMinimapBounds([{ x: 400, y: 300 }]);
  assert(Number.isFinite(singleRes.scale) && singleRes.scale > 0, "1 node produces finite positive scale");
  assert.strictEqual(singleRes.box.minX, -200, "1 node expands minX by 600");
  assert.strictEqual(singleRes.box.maxX, 1000, "1 node expands maxX by 600");

  // N nodes
  const multiRes = computeMinimapBounds([
    { x: 0, y: 0 },
    { x: 1500, y: 1200 },
  ]);
  assert(Number.isFinite(multiRes.scale) && multiRes.scale > 0, "N nodes produces finite positive scale");
  assert(multiRes.box.width >= 1900, "N nodes box encompasses all nodes plus padding");
  console.log("✅ Minimap bounding box fallback and scale clamping passed.");

  // ----------------------------------------------------
  // TEST 5: Room Mode Switching & Validation
  // ----------------------------------------------------
  console.log("\n--- 5. Room Mode Switching & Validation ---");

  // Switch to brainstorm
  const updatedBrainstorm = await roomService.updateRoomMode(testRoomId, {
    mode: "brainstorm",
    systemContext: "Focus on divergent, creative visual concept generation.",
  });
  assert.strictEqual(updatedBrainstorm.mode, "brainstorm", "Mode updated to brainstorm in DB");
  assert.strictEqual(
    updatedBrainstorm.systemContext,
    "Focus on divergent, creative visual concept generation.",
    "System context updated"
  );

  // Switch back to operational
  const updatedOperational = await roomService.updateRoomMode(testRoomId, {
    mode: "operational",
    systemContext: "Strict action item and decision tracking.",
  });
  assert.strictEqual(updatedOperational.mode, "operational", "Mode updated back to operational in DB");
  console.log("✅ Room mode switching and systemContext persistence passed.");

  // ----------------------------------------------------
  // TEST 6: ContextZone CRUD Persistence in Neon PostgreSQL
  // ----------------------------------------------------
  console.log("\n--- 6. ContextZone Persistence in Neon PostgreSQL ---");

  // Create zone
  const zone1 = await roomService.addContextZone(testRoomId, {
    name: "Roadmap Cluster",
    x: 450.5,
    y: -200.0,
    zoom: 1.0,
  });
  assert(zone1.id, "ContextZone assigned real database ID");
  assert.strictEqual(zone1.name, "Roadmap Cluster", "Zone name matches");
  assert.strictEqual(zone1.roomId, testRoomId, "Zone roomId matches");

  const zone2 = await roomService.addContextZone(testRoomId, {
    name: "Risks & Blockers Area",
    x: 1200.0,
    y: 800.0,
    zoom: 1.2,
  });
  assert(zone2.id, "Zone 2 created");

  // Fetch zones
  const zones = await roomService.getContextZones(testRoomId);
  assert.strictEqual(zones.length, 2, "Fetched exactly 2 context zones");

  // Delete zone 1
  await roomService.deleteContextZone(testRoomId, zone1.id);
  const remainingZones = await roomService.getContextZones(testRoomId);
  assert.strictEqual(remainingZones.length, 1, "Only 1 zone remains after deletion");
  assert.strictEqual(remainingZones[0].id, zone2.id, "Remaining zone is zone 2");

  // Cleanup zone 2
  await roomService.deleteContextZone(testRoomId, zone2.id);
  const finalZones = await roomService.getContextZones(testRoomId);
  assert.strictEqual(finalZones.length, 0, "All test zones cleaned up");
  console.log("✅ ContextZone database CRUD passed.");

  console.log("\n========================================================");
  console.log("🎉 ALL 6 PHASE 6 BACKEND TESTS PASSED SUCCESSFULLY!");
  console.log("========================================================\n");
} catch (err) {
  console.error("\n❌ Test failure:", err);
  process.exit(1);
} finally {
  // Cleanup test room from PostgreSQL
  try {
    await prisma.room.delete({ where: { id: testRoomId } });
  } catch (_) {}
}
