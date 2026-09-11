import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config/env.js";

export function generateAccessToken(payload) {
  return jwt.sign(payload, config.accessTokenSecret, { expiresIn: "15m" });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.refreshTokenSecret, { expiresIn: "7d" });
}

export function generateGuestToken(payload) {
  return jwt.sign(payload, config.guestTokenSecret, { expiresIn: "8h" });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.accessTokenSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.refreshTokenSecret);
}

export function verifyGuestToken(token) {
  return jwt.verify(token, config.guestTokenSecret);
}

export async function hashToken(token) {
  return bcrypt.hash(token, 10);
}

export async function compareToken(token, hash) {
  return bcrypt.compare(token, hash);
}
