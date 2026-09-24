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

export function issueGuestSession(res, roomId, name, role = "member") {
  // A guest's stable identity used to be derived purely from their typed
  // display name (`guest-${name}`) — any guest could pick an existing
  // teammate's name and spoof their attribution, and two guests who happened
  // to type the same name literally collided into one identity. This random
  // suffix keeps the human-chosen name for display while giving each session
  // its own distinct identity, same pattern already used for fully anonymous
  // connections (createAnonymousGuestUser in auth.middleware.js).
  const guestId = crypto.randomBytes(4).toString("hex");
  const guestToken = generateGuestToken({
    roomId,
    name,
    guestId,
    isGuest: true,
    role,
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