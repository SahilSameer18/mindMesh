import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { generateGuestToken } from "../utils/tokens.js";
import { config } from "../config/env.js";

export async function createInviteLink(roomId, createdBy, role = "member", expiresInHours = 48) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return prisma.inviteLink.create({
    data: { token, roomId, createdBy, role, expiresAt },
  });
}

export async function resolveInviteLink(token) {
  const invite = await prisma.inviteLink.findUnique({
    where: { token },
    include: { room: { select: { id: true, name: true } } },
  });

  if (!invite) return null;
  if (invite.expiresAt && invite.expiresAt < new Date()) return null;
  return invite;
}

export function issueGuestSession(res, roomId, name) {
  const guestToken = generateGuestToken({
    roomId,
    name,
    isGuest: true,
  });

  const isProd = config.nodeEnv === "production";

  res.cookie("guest_session", guestToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });
}