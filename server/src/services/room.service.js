import prisma from "../lib/prisma.js";
import { loadCanvasState, saveLocalSnapshot, loadLocalSnapshot } from "../canvas/canvasPersistence.js";

const DEFAULT_WORKSPACE_ID = "default-workspace";

async function ensureDefaultWorkspace() {
  try {
    if (prisma) {
      await prisma.workspace.upsert({
        where: { id: DEFAULT_WORKSPACE_ID },
        update: {},
        create: {
          id: DEFAULT_WORKSPACE_ID,
          name: "mindMesh Studio",
        },
      });
    }
  } catch (err) {
    console.warn("[RoomService] Ensure workspace warning:", err.message);
  }
}

export async function getOrCreateRoom(roomId, { name, mode = "operational", systemContext = null } = {}) {
  await ensureDefaultWorkspace();

  try {
    if (prisma) {
      let room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          members: { include: { user: true } },
          zones: true,
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
            zones: true,
            integrations: true,
          },
        });
      }

      const canvas = await loadCanvasState(roomId);
      return { ...room, canvas };
    }
  } catch (err) {
    console.warn(`[RoomService] Prisma getOrCreateRoom failed, using local:`, err.message);
  }

  // Fallback
  let localRoom = loadLocalSnapshot(`room-meta-${roomId}`);
  if (!localRoom) {
    localRoom = {
      id: roomId,
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: name || `Room ${roomId.slice(0, 8)}`,
      mode,
      systemContext,
      members: [],
      zones: [],
      integrations: [],
      createdAt: new Date().toISOString(),
    };
    saveLocalSnapshot(`room-meta-${roomId}`, localRoom);
  }

  const canvas = await loadCanvasState(roomId);
  return { ...localRoom, canvas };
}

export async function getRoom(roomId) {
  try {
    if (prisma) {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          members: { include: { user: true } },
          zones: true,
          integrations: true,
        },
      });
      if (room) {
        const canvas = await loadCanvasState(roomId);
        return { ...room, canvas };
      }
    }
  } catch (err) {
    console.warn("[RoomService] DB getRoom failed:", err.message);
  }

  const local = loadLocalSnapshot(`room-meta-${roomId}`);
  if (local) {
    const canvas = await loadCanvasState(roomId);
    return { ...local, canvas };
  }
  return null;
}

export async function updateRoom(roomId, updates) {
  try {
    if (prisma) {
      const updated = await prisma.room.update({
        where: { id: roomId },
        data: updates,
      });
      return updated;
    }
  } catch (err) {
    console.warn("[RoomService] DB updateRoom failed:", err.message);
  }

  const local = loadLocalSnapshot(`room-meta-${roomId}`) || { id: roomId };
  const updated = { ...local, ...updates, updatedAt: new Date().toISOString() };
  saveLocalSnapshot(`room-meta-${roomId}`, updated);
  return updated;
}

export async function addContextZone(roomId, { name, x, y, zoom = 1.0 }) {
  try {
    if (prisma) {
      return await prisma.contextZone.create({
        data: { roomId, name, x, y, zoom },
      });
    }
  } catch (err) {
    console.warn("[RoomService] DB addContextZone failed:", err.message);
  }

  const zone = { id: `zone-${Date.now()}`, roomId, name, x, y, zoom };
  return zone;
}
