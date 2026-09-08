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

export async function getOrCreateRoom(roomId, { name, mode = "operational", systemContext = null, userId = null } = {}) {
  try {
    await ensureDefaultWorkspace();

    let room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { include: { user: true } },
        integrations: true,
      },
    });

    let validUser = null;
    if (userId) {
      validUser = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    }

    if (!room) {
      room = await prisma.room.create({
        data: {
          id: roomId,
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: name || `Room ${roomId.slice(0, 8)}`,
          mode,
          systemContext,
          ...(validUser
            ? {
                members: {
                  create: {
                    userId: validUser.id,
                    role: "owner",
                  },
                },
              }
            : {}),
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

export async function getContextZones(roomId) {
  try {
    return await prisma.contextZone.findMany({
      where: { roomId },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error(`[RoomService] Error fetching context zones for room ${roomId}:`, err.message);
    throw err;
  }
}

export async function deleteContextZone(roomId, zoneId) {
  try {
    const existing = await prisma.contextZone.findUnique({
      where: { id: zoneId },
    });

    if (!existing || existing.roomId !== roomId) {
      return null;
    }

    return await prisma.contextZone.delete({
      where: { id: zoneId },
    });
  } catch (err) {
    console.error(`[RoomService] Error deleting context zone ${zoneId}:`, err.message);
    throw err;
  }
}

export async function updateRoomMode(roomId, { mode, systemContext }) {
  try {
    const data = {};
    if (mode !== undefined) data.mode = mode;
    if (systemContext !== undefined) data.systemContext = systemContext;

    return await prisma.room.update({
      where: { id: roomId },
      data,
    });
  } catch (err) {
    console.error(`[RoomService] Error updating mode for room ${roomId}:`, err.message);
    throw err;
  }
}

export async function listRooms() {
  try {
    return await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        _count: {
          select: {
            nodes: true,
            edges: true,
            transcriptChunks: true,
            members: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("[RoomService] Error listing rooms:", err.message);
    throw err;
  }
}

export async function deleteRoom(roomId) {
  try {
    await prisma.room.delete({
      where: { id: roomId },
    });
    return true;
  } catch (err) {
    console.error(`[RoomService] Error deleting room ${roomId}:`, err.message);
    throw err;
  }
}



