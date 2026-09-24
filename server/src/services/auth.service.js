import prisma from "../lib/prisma.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
} from "../utils/tokens.js";

export async function generateAndStoreTokens(userId, userPayload) {
  const accessToken = generateAccessToken(userPayload);
  const rawRefreshToken = generateRefreshToken({ id: userId });

  const tokenHash = await hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  // Cap active sessions at 10 — evict oldest beyond that so bcrypt.compare
  // in rotateRefreshToken never has to check more than 10 rows.
  const MAX_SESSIONS = 10;
  const activeSessions = await prisma.refreshToken.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (activeSessions.length > MAX_SESSIONS) {
    const toDelete = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS);
    await prisma.refreshToken.deleteMany({
      where: { id: { in: toDelete.map((s) => s.id) } },
    });
  }

  return { accessToken, refreshToken: rawRefreshToken };
}

// Short-lived grace cache for refresh-token rotation: two tabs whose access
// tokens expire around the same moment will both present the SAME (soon to be
// consumed) refresh token concurrently. Without this, the second request to
// land finds its token already deleted by the first and the reuse-detection
// safety net below (correctly meant to catch real token theft) nukes every
// session for that user — a "random logout storm" from nothing more than
// having two tabs open. Keyed by the consumed token's id, holds the in-flight
// (then settled) replacement-pair promise for a few seconds so a same-token
// replay joins/re-returns it instead of being treated as an attack.
const recentRotations = new Map(); // consumedTokenId -> { userId, consumedTokenHash, promise, expiresAt }
const ROTATION_GRACE_MS = 10_000;

function pruneExpiredRotations() {
  const now = Date.now();
  for (const [key, entry] of recentRotations) {
    if (entry.expiresAt <= now) recentRotations.delete(key);
  }
}

export async function rotateRefreshToken(incomingRawToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRawToken);
  } catch {
    throw { status: 401, message: "Invalid or expired refresh token" };
  }

  const activeTokens = await prisma.refreshToken.findMany({
    where: {
      userId: decoded.id,
      expiresAt: { gt: new Date() },
    },
  });

  let matchedToken = null;
  for (const record of activeTokens) {
    const isMatch = await compareToken(incomingRawToken, record.tokenHash);
    if (isMatch) {
      matchedToken = record;
      break;
    }
  }

  pruneExpiredRotations();

  if (!matchedToken) {
    // Before concluding theft: was this raw token just rotated a moment ago by
    // a concurrent request (another tab)? If so, this is a benign replay —
    // await/hand back the same replacement pair instead of revoking everything.
    for (const entry of recentRotations.values()) {
      if (entry.userId === decoded.id && (await compareToken(incomingRawToken, entry.consumedTokenHash))) {
        return entry.promise;
      }
    }

    // Suspected token reuse / theft: revoke all sessions for this user as safety measure
    await prisma.refreshToken.deleteMany({ where: { userId: decoded.id } });
    throw { status: 401, message: "Refresh token reuse detected; all sessions revoked" };
  }

  // A concurrent request may have matched this exact same row a moment ago
  // (both findMany calls can land before either has deleted anything) — join
  // its in-flight rotation instead of racing the delete below, which would
  // otherwise throw "record not found" for whichever request loses the race.
  const inFlight = recentRotations.get(matchedToken.id);
  if (inFlight) {
    return inFlight.promise;
  }

  // Register the in-flight promise BEFORE awaiting anything else — a
  // concurrent request presenting the same (about-to-be-deleted) token must
  // find this entry already here, not a window where it doesn't exist yet
  // (that gap is exactly what let the race through in an earlier version).
  const rotationPromise = (async () => {
    await prisma.refreshToken.delete({ where: { id: matchedToken.id } }).catch(() => {
      // Already deleted by the request we just joined above, or a genuine
      // duplicate; nothing left to do here, generateAndStoreTokens below
      // still issues this caller a perfectly valid session either way.
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw { status: 404, message: "User not found" };

    return generateAndStoreTokens(user.id, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "user",
    });
  })();

  recentRotations.set(matchedToken.id, {
    userId: decoded.id,
    consumedTokenHash: matchedToken.tokenHash,
    promise: rotationPromise,
    expiresAt: Date.now() + ROTATION_GRACE_MS,
  });

  return rotationPromise;
}

export async function revokeSession(userId, sessionId) {
  return prisma.refreshToken.deleteMany({
    where: { id: sessionId, userId },
  });
}

export async function revokeAllSessions(userId) {
  return prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

export async function listSessions(userId) {
  return prisma.refreshToken.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });
}