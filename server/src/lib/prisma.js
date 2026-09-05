import dotenv from "dotenv";
dotenv.config();

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

let prismaInstance = null;

export function getPrisma() {
  if (prismaInstance) return prismaInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[Prisma] No DATABASE_URL found, running in offline snapshot mode");
    return null;
  }

  try {
    const adapter = new PrismaNeon({ connectionString });
    prismaInstance = new PrismaClient({ adapter });
    return prismaInstance;
  } catch (err) {
    console.warn("[Prisma] Failed to initialize PrismaNeon adapter:", err.message);
    return null;
  }
}

// Proxy client for safe runtime instantiation
const prisma = new Proxy({}, {
  get(_target, prop) {
    const client = getPrisma();
    if (!client) return undefined;
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  }
});

export default prisma;
