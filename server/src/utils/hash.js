import crypto from "crypto";

/**
 * Recursively sort keys of an object to ensure deterministic JSON serialization
 */
export function normalizePayload(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (payload instanceof Date) {
    return payload.toISOString();
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizePayload);
  }

  if (typeof payload === "object") {
    const sorted = {};
    const keys = Object.keys(payload).sort();
    for (const key of keys) {
      sorted[key] = normalizePayload(payload[key]);
    }
    return sorted;
  }

  return payload;
}

/**
 * Compute deterministic SHA-256 fingerprint for AI action idempotency
 * @param {string} roomId
 * @param {string|null} sourceId
 * @param {string} type
 * @param {object} payload
 * @returns {string} 64-character hex hash
 */
export function computeFingerprint(roomId, sourceId, type, payload) {
  const normalized = JSON.stringify(normalizePayload(payload || {}));
  const rawKey = `${roomId || ""}:${sourceId || ""}:${type || ""}:${normalized}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}
