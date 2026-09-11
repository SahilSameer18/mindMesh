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

  return { accessToken, refreshToken: rawRefreshToken };
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

  if (!matchedToken) {
    // Suspected token reuse / theft: revoke all sessions for this user as safety measure
    await prisma.refreshToken.deleteMany({ where: { userId: decoded.id } });
    throw { status: 401, message: "Refresh token reuse detected; all sessions revoked" };
  }

  // Consume old token
  await prisma.refreshToken.delete({ where: { id: matchedToken.id } });

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw { status: 404, message: "User not found" };

  return generateAndStoreTokens(user.id, {
    id: user.id,
    email: user.email,
    name: user.name,
  });
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