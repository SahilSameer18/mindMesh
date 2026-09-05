import prisma from "../lib/prisma.js";

/**
 * Load full canvas state for a room from Neon PostgreSQL via Prisma
 */
export async function loadCanvasState(roomId) {
  try {
    const [nodes, edges, zones] = await Promise.all([
      prisma.canvasNode.findMany({ where: { roomId } }),
      prisma.canvasEdge.findMany({ where: { roomId } }),
      prisma.contextZone.findMany({ where: { roomId } }),
    ]);

    return {
      nodes: nodes || [],
      edges: edges || [],
      zones: zones || [],
    };
  } catch (err) {
    console.error(`[Persistence] Error loading canvas state for room ${roomId}:`, err.message);
    return { nodes: [], edges: [], zones: [] };
  }
}

/**
 * Persist an atomic canvas action to Neon PostgreSQL via Prisma
 */
export async function persistCanvasAction(roomId, action) {
  const { type, payload } = action;
  if (!payload || !roomId) return;

  try {
    switch (type) {
      case "CREATE_NODE":
        return await prisma.canvasNode.upsert({
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

      case "UPDATE_NODE":
        return await prisma.canvasNode.update({
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

      case "MOVE_NODE":
        return await prisma.canvasNode.update({
          where: { id: payload.id },
          data: { x: payload.x, y: payload.y },
        });

      case "DELETE_NODE":
        // Delete connected edges first to respect referential integrity
        await prisma.canvasEdge.deleteMany({
          where: {
            roomId,
            OR: [{ fromId: payload.id }, { toId: payload.id }],
          },
        });
        return await prisma.canvasNode.deleteMany({
          where: { id: payload.id, roomId },
        });

      case "CREATE_EDGE":
        return await prisma.canvasEdge.create({
          data: {
            id: payload.id,
            roomId,
            fromId: payload.fromId,
            toId: payload.toId,
            label: payload.label || null,
            type: payload.type || "related_to",
          },
        });

      case "DELETE_EDGE":
        return await prisma.canvasEdge.deleteMany({
          where: { id: payload.id, roomId },
        });

      default:
        console.warn(`[Persistence] Unknown canvas action type: ${type}`);
        return null;
    }
  } catch (err) {
    console.error(`[Persistence] Error persisting action ${type} to database:`, err.message);
    throw err;
  }
}
