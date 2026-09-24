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
      case "CREATE_NODE": {
        // upsert's `where` must be a bare unique-field lookup (Prisma doesn't allow
        // extra filter fields there), so cross-room ownership has to be checked
        // explicitly before deciding create vs. update — otherwise a client that
        // knows another room's node id could overwrite that room's content here.
        const existingOwner = await prisma.canvasNode.findUnique({
          where: { id: payload.id },
          select: { roomId: true },
        });
        if (existingOwner && existingOwner.roomId !== roomId) {
          throw new Error(`Refused CREATE_NODE: id ${payload.id} belongs to a different room`);
        }
        return await prisma.canvasNode.upsert({
          where: { id: payload.id },
          update: {
            text: payload.text || "",
            type: payload.type || "idea",
            semanticKey: payload.semanticKey || null,
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            metadata: payload.metadata || null,
            ...(payload.sourceType ? { sourceType: payload.sourceType } : {}),
            ...(payload.sourceId ? { sourceId: payload.sourceId } : {}),
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
      }

      case "UPDATE_NODE": {
        // update()'s `where` only accepts unique fields (just `id` here — no
        // compound @@unique([id, roomId]) in the schema), so scoping by room
        // has to go through updateMany's full-filter `where` instead; a count
        // of 0 means the id exists but belongs to a different room.
        const result = await prisma.canvasNode.updateMany({
          where: { id: payload.id, roomId },
          data: {
            text: payload.text,
            type: payload.type,
            semanticKey: payload.semanticKey,
            x: payload.x,
            y: payload.y,
            metadata: payload.metadata,
            ...(payload.sourceType ? { sourceType: payload.sourceType } : {}),
            ...(payload.sourceId ? { sourceId: payload.sourceId } : {}),
          },
        });
        if (result.count === 0) {
          throw new Error(`Refused UPDATE_NODE: id ${payload.id} not found in room ${roomId}`);
        }
        return result;
      }

      case "MOVE_NODE": {
        const result = await prisma.canvasNode.updateMany({
          where: { id: payload.id, roomId },
          data: { x: payload.x, y: payload.y },
        });
        if (result.count === 0) {
          throw new Error(`Refused MOVE_NODE: id ${payload.id} not found in room ${roomId}`);
        }
        return result;
      }

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

      case "CREATE_EDGE": {
        const existingOwner = await prisma.canvasEdge.findUnique({
          where: { id: payload.id },
          select: { roomId: true },
        });
        if (existingOwner && existingOwner.roomId !== roomId) {
          throw new Error(`Refused CREATE_EDGE: id ${payload.id} belongs to a different room`);
        }
        return await prisma.canvasEdge.upsert({
          where: { id: payload.id },
          update: {
            fromId: payload.fromId,
            toId: payload.toId,
            label: payload.label || null,
            type: payload.type || "related_to",
          },
          create: {
            id: payload.id,
            roomId,
            fromId: payload.fromId,
            toId: payload.toId,
            label: payload.label || null,
            type: payload.type || "related_to",
          },
        });
      }

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
