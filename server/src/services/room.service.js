import prisma from "../lib/prisma.js";
import { loadCanvasState } from "../canvas/canvasPersistence.js";

const DEFAULT_WORKSPACE_ID = "default-workspace";

async function ensureDefaultWorkspace() {
  try {
    await prisma.workspace.upsert({
      where: { id: DEFAULT_WORKSPACE_ID },
      update: {},
      create: {
        id: DEFAULT_WORKSPACE_ID,
        name: "mindMesh Studio",
      },
    });
  } catch (err) {
    console.error("[RoomService] Error ensuring default workspace:", err.message);
    throw err;
  }
}

export async function getOrCreateRoom(roomId, { name, mode = "operational", systemContext = null } = {}) {
  try {
    await ensureDefaultWorkspace();

    let room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { include: { user: true } },
        integrations: true,
      },
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          id: roomId,
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: name || `Room ${roomId.slice(0, 8)}`,
          mode,
          systemContext,
        },
        include: {
          members: { include: { user: true } },
          integrations: true,
        },
      });
    }

    const canvas = await loadCanvasState(roomId);
    return { ...room, canvas };
  } catch (err) {
    console.error(`[RoomService] Error in getOrCreateRoom for ${roomId}:`, err.message);
    throw err;
  }
}

export async function getRoom(roomId) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { include: { user: true } },
        integrations: true,
      },
    });

    if (!room) return null;

    const canvas = await loadCanvasState(roomId);
    return { ...room, canvas };
  } catch (err) {
    console.error(`[RoomService] Error fetching room ${roomId}:`, err.message);
    throw err;
  }
}

export async function updateRoom(roomId, updates) {
  try {
    return await prisma.room.update({
      where: { id: roomId },
      data: updates,
    });
  } catch (err) {
    console.error(`[RoomService] Error updating room ${roomId}:`, err.message);
    throw err;
  }
}

export async function addContextZone(roomId, { name, x, y, zoom = 1.0 }) {
  try {
    return await prisma.contextZone.create({
      data: { roomId, name, x, y, zoom },
    });
  } catch (err) {
    console.error(`[RoomService] Error adding context zone to room ${roomId}:`, err.message);
    throw err;
  }
}


