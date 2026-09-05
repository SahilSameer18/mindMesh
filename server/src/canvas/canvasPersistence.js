import fs from "fs";
import path from "path";
import prisma from "../lib/prisma.js";

const DATA_DIR = path.resolve(process.cwd(), "data", "rooms");

// Ensure local persistence directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("[Persistence] Could not create local data dir:", e.message);
}

const getLocalFilePath = (roomId) => path.join(DATA_DIR, `${roomId}.json`);

export const saveLocalSnapshot = (roomId, data) => {
  try {
    fs.writeFileSync(getLocalFilePath(roomId), JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[Persistence] Local snapshot save failed:", err.message);
  }
};

export const loadLocalSnapshot = (roomId) => {
  try {
    const filePath = getLocalFilePath(roomId);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[Persistence] Local snapshot read failed:", err.message);
  }
  return null;
};

/**
 * Load full canvas state for a room (from Prisma with local fallback)
 */
export async function loadCanvasState(roomId) {
  try {
    if (prisma) {
      const [nodes, edges, zones] = await Promise.all([
        prisma.canvasNode.findMany({ where: { roomId } }),
        prisma.canvasEdge.findMany({ where: { roomId } }),
        prisma.contextZone.findMany({ where: { roomId } }),
      ]);

      if (nodes && nodes.length > 0) {
        const state = { nodes, edges, zones };
        saveLocalSnapshot(roomId, state);
        return state;
      }
    }
  } catch (err) {
    console.warn(`[Persistence] Prisma read failed for room ${roomId}, falling back to local snapshot:`, err.message);
  }

  // Fallback to local snapshot
  const local = loadLocalSnapshot(roomId);
  if (local) return local;

  return { nodes: [], edges: [], zones: [] };
}

/**
 * Persist an atomic canvas action to DB and local store
 */
export async function persistCanvasAction(roomId, action) {
  const { type, payload } = action;

  // 1. Always update local snapshot for instant resilience
  const local = loadLocalSnapshot(roomId) || { nodes: [], edges: [], zones: [] };
  if (!local.nodes) local.nodes = [];
  if (!local.edges) local.edges = [];
  if (!local.zones) local.zones = [];

  if (type === "CREATE_NODE") {
    const idx = local.nodes.findIndex((n) => n.id === payload.id);
    if (idx >= 0) local.nodes[idx] = { ...local.nodes[idx], ...payload };
    else local.nodes.push(payload);
  } else if (type === "UPDATE_NODE" || type === "MOVE_NODE") {
    const idx = local.nodes.findIndex((n) => n.id === payload.id);
    if (idx >= 0) local.nodes[idx] = { ...local.nodes[idx], ...payload };
    else local.nodes.push(payload);
  } else if (type === "DELETE_NODE") {
    local.nodes = local.nodes.filter((n) => n.id !== payload.id);
    local.edges = local.edges.filter((e) => e.fromId !== payload.id && e.toId !== payload.id);
  } else if (type === "CREATE_EDGE") {
    const idx = local.edges.findIndex((e) => e.id === payload.id);
    if (idx >= 0) local.edges[idx] = { ...local.edges[idx], ...payload };
    else local.edges.push(payload);
  } else if (type === "DELETE_EDGE") {
    local.edges = local.edges.filter((e) => e.id !== payload.id);
  }
  saveLocalSnapshot(roomId, local);

  // 2. Persist to Prisma database
  try {
    if (prisma) {
      switch (type) {
        case "CREATE_NODE":
          await prisma.canvasNode.upsert({
            where: { id: payload.id },
            update: {
              text: payload.text || "",
              type: payload.type || "idea",
              semanticKey: payload.semanticKey || null,
              x: payload.x ?? 0,
              y: payload.y ?? 0,
              metadata: payload.metadata || null,
            },
            create: {
              id: payload.id,
              roomId,
              text: payload.text || "",
              type: payload.type || "idea",
              semanticKey: payload.semanticKey || null,
              x: payload.x ?? 0,
              y: payload.y ?? 0,
              metadata: payload.metadata || null,
              sourceType: payload.sourceType || "manual",
              sourceId: payload.sourceId || null,
            },
          });
          break;

        case "UPDATE_NODE":
          await prisma.canvasNode.update({
            where: { id: payload.id },
            data: {
              text: payload.text,
              type: payload.type,
              semanticKey: payload.semanticKey,
              x: payload.x,
              y: payload.y,
              metadata: payload.metadata,
            },
          });
          break;

        case "MOVE_NODE":
          await prisma.canvasNode.update({
            where: { id: payload.id },
            data: { x: payload.x, y: payload.y },
          });
          break;

        case "DELETE_NODE":
          await prisma.canvasNode.deleteMany({
            where: { id: payload.id, roomId },
          });
          await prisma.canvasEdge.deleteMany({
            where: {
              roomId,
              OR: [{ fromId: payload.id }, { toId: payload.id }],
            },
          });
          break;

        case "CREATE_EDGE":
          await prisma.canvasEdge.create({
            data: {
              id: payload.id,
              roomId,
              fromId: payload.fromId,
              toId: payload.toId,
              label: payload.label || null,
              type: payload.type || "related_to",
            },
          });
          break;

        case "DELETE_EDGE":
          await prisma.canvasEdge.deleteMany({
            where: { id: payload.id, roomId },
          });
          break;

        default:
          break;
      }
    }
  } catch (err) {
    console.warn(`[Persistence] Notice: DB sync for ${type} had warning:`, err.message);
  }
}
