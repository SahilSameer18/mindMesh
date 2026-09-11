import prisma from "../lib/prisma.js";

export async function pruneExpiredTokens() {
  try {
    const { count } = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) {
      console.log(`[TokenCleanup] Pruned ${count} expired refresh token(s)`);
    }
  } catch (err) {
    console.error("[TokenCleanup] Error pruning expired tokens:", err);
  }
}

export function startTokenCleanup() {
  pruneExpiredTokens(); // Run once on startup
  setInterval(pruneExpiredTokens, 24 * 60 * 60 * 1000); // Repeat every 24h
}


