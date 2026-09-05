import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma.js";

async function main() {
  console.log("🌱 Starting database seed...");

  const passwordHash = await bcrypt.hash("demo1234", 10);

  // 1. Seed Demo Users
  const elena = await prisma.user.upsert({
    where: { id: "demo-user-1" },
    update: {
      name: "Elena Vance",
      email: "elena@mindmesh.ai",
    },
    create: {
      id: "demo-user-1",
      name: "Elena Vance",
      email: "elena@mindmesh.ai",
      passwordHash,
    },
  });

  const marcus = await prisma.user.upsert({
    where: { id: "demo-user-2" },
    update: {
      name: "Marcus Sterling",
      email: "marcus@mindmesh.ai",
    },
    create: {
      id: "demo-user-2",
      name: "Marcus Sterling",
      email: "marcus@mindmesh.ai",
      passwordHash,
    },
  });

  console.log(`✅ Seeded users: ${elena.name} (${elena.id}), ${marcus.name} (${marcus.id})`);

  // 2. Seed Default Workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: "default-workspace" },
    update: { name: "mindMesh Studio" },
    create: {
      id: "default-workspace",
      name: "mindMesh Studio",
    },
  });

  console.log(`✅ Seeded workspace: ${workspace.name} (${workspace.id})`);

  // 3. Seed Default Demo Room
  const room = await prisma.room.upsert({
    where: { id: "demo-room" },
    update: {
      name: "Main Strategy Canvas",
      mode: "operational",
    },
    create: {
      id: "demo-room",
      workspaceId: workspace.id,
      name: "Main Strategy Canvas",
      mode: "operational",
      systemContext: "You are mindMesh Echo assistant. Track owners, blockers, and decisions.",
    },
  });

  console.log(`✅ Seeded room: ${room.name} (${room.id})`);

  // 4. Seed Memberships
  await prisma.roomMember.upsert({
    where: {
      roomId_userId: { roomId: room.id, userId: elena.id },
    },
    update: { role: "owner" },
    create: {
      roomId: room.id,
      userId: elena.id,
      role: "owner",
    },
  });

  await prisma.roomMember.upsert({
    where: {
      roomId_userId: { roomId: room.id, userId: marcus.id },
    },
    update: { role: "member" },
    create: {
      roomId: room.id,
      userId: marcus.id,
      role: "member",
    },
  });

  console.log(`✅ Seeded room memberships: Elena (owner), Marcus (member)`);
  console.log("🚀 Database seed completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  });

