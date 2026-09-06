import crypto from "crypto";

const FILLER_WORDS = new Set([
  "yeah",
  "yep",
  "yes",
  "nope",
  "uh",
  "huh",
  "uhhuh",
  "um",
  "mm",
  "okay",
  "ok",
  "sure",
  "cool",
  "right",
  "thanks",
  "thank",
  "you",
  "agreed",
  "hmm",
  "sounds",
  "good",
  "got",
  "it",
  "all",
  "makes",
  "sense",
]);

const FILLER_PHRASES = new Set([
  "got it",
  "sounds good",
  "thank you",
  "all good",
  "makes sense",
]);

const ACTION_MARKERS = /\b(not|instead|assign|take|takes|but|wait|actually|no|let's|cancel|remove|block|blocks|owner|who|will)\b/i;

/**
 * Filter out pure conversational fluff while strictly preserving short
 * factual decisions and corrections (e.g. "Sam takes it", "Sam, not Mike", "No, wait").
 * @param {string} text
 * @returns {boolean} True if pure filler and safe to discard
 */
export function isConversationalFiller(text) {
  if (!text || typeof text !== "string") return true;
  const clean = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return true;

  // Never drop utterances containing action/correction markers
  if (ACTION_MARKERS.test(clean)) return false;

  // Check known multi-word filler phrases
  if (FILLER_PHRASES.has(clean)) return true;

  const tokens = clean.split(/\s+/).filter(Boolean);
  // Discard ONLY if every token in the utterance is in the filler whitelist
  return tokens.length > 0 && tokens.every((t) => FILLER_WORDS.has(t));
}

/**
 * Single-Flight Coalescing Queue Manager
 * Ensures:
 * 1. Only 1 LLM extraction in-flight per room at any time.
 * 2. 3.5s cooldown window hard-capping rate to <= 17 RPM.
 * 3. FIFO accumulator queue buffering incoming dialogue chunks in arrival order.
 * 4. Deterministic sorted batch hash for idempotency sourceId.
 */
class ExtractionQueueManager {
  constructor() {
    this.queues = new Map();
    this.COOLDOWN_MS = 3500;
    this.PAUSE_DEBOUNCE_MS = 1500;
    this.CEILING_MS = 9000; // 9s max monologue window before forced flush
  }

  getQueue(roomId) {
    if (!this.queues.has(roomId)) {
      this.queues.set(roomId, {
        accumulator: [], // FIFO queue of { id, speaker, text, timestamp, userId }
        isInFlight: false,
        lastFlushTime: 0,
        firstChunkTime: 0,
        debounceTimer: null,
        lastSpeaker: null,
      });
    }
    return this.queues.get(roomId);
  }

  /**
   * Enqueue a dialogue chunk in strict arrival order
   */
  enqueue(roomId, chunk, { onFlush, io = null } = {}) {
    const queue = this.getQueue(roomId);

    // Filter pure filler
    if (isConversationalFiller(chunk.text)) {
      return { dropped: true, reason: "filler" };
    }

    // Set monologue window start time on first chunk in empty batch
    if (queue.accumulator.length === 0) {
      queue.firstChunkTime = Date.now();
    }

    // Push in arrival order (FIFO)
    queue.accumulator.push({
      ...chunk,
      id: chunk.id || `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: chunk.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });

    const isSpeakerTurn = queue.lastSpeaker && chunk.speaker && queue.lastSpeaker !== chunk.speaker;
    queue.lastSpeaker = chunk.speaker;

    // Trigger scheduling
    this.scheduleFlush(roomId, { onFlush, io, immediate: isSpeakerTurn });
    return { dropped: false, queuedCount: queue.accumulator.length };
  }

  scheduleFlush(roomId, { onFlush, io = null, immediate = false } = {}) {
    const queue = this.getQueue(roomId);
    if (queue.debounceTimer) {
      clearTimeout(queue.debounceTimer);
      queue.debounceTimer = null;
    }

    if (queue.isInFlight) {
      // An extraction is currently running; buffered chunks will flush once in-flight completes
      return;
    }

    const now = Date.now();
    const timeSinceLastFlush = now - queue.lastFlushTime;
    const remainingCooldown = Math.max(0, this.COOLDOWN_MS - timeSinceLastFlush);
    const timeSinceFirstChunk = now - (queue.firstChunkTime || now);
    const ceilingForced = timeSinceFirstChunk >= this.CEILING_MS;

    let delay;
    if (immediate || ceilingForced) {
      delay = remainingCooldown;
    } else {
      // Clamp debounce delay to never exceed the 9s ceiling window
      const timeUntilCeiling = Math.max(0, this.CEILING_MS - timeSinceFirstChunk);
      delay = Math.max(remainingCooldown, Math.min(this.PAUSE_DEBOUNCE_MS, timeUntilCeiling));
    }

    queue.debounceTimer = setTimeout(() => {
      this.flush(roomId, { onFlush, io });
    }, Math.max(0, delay));
  }

  /**
   * Flush all accumulated dialogue in a single batch
   */
  async flush(roomId, { onFlush, io = null } = {}) {
    const queue = this.getQueue(roomId);
    if (queue.isInFlight || queue.accumulator.length === 0) {
      return null;
    }

    queue.isInFlight = true;
    if (queue.debounceTimer) {
      clearTimeout(queue.debounceTimer);
      queue.debounceTimer = null;
    }

    // Take snapshot in arrival order
    const chunks = [...queue.accumulator];
    queue.accumulator = [];
    queue.firstChunkTime = 0;

    // Deterministic hash over sorted chunk elements to guarantee identical sourceId on retries
    const sortedForHash = chunks.slice().sort((a, b) =>
      (a.timestamp || "").localeCompare(b.timestamp || "") || (a.text || "").localeCompare(b.text || "")
    );

    const chunkFingerprint = crypto
      .createHash("sha256")
      .update(sortedForHash.map((c) => `${c.speaker}:${c.text.trim()}:${c.timestamp || ""}`).join("|"))
      .digest("hex")
      .slice(0, 16);

    const sourceId = `stream:${roomId}:${chunkFingerprint}`;

    try {
      if (typeof onFlush === "function") {
        return await onFlush({ roomId, chunks, sourceId, io });
      }
    } catch (err) {
      console.error(`[ExtractionQueue] Error flushing dialogue for room ${roomId}:`, err.message);
      throw err;
    } finally {
      queue.isInFlight = false;
      queue.lastFlushTime = Date.now();

      // If more chunks accumulated while in-flight, schedule next flush
      if (queue.accumulator.length > 0) {
        this.scheduleFlush(roomId, { onFlush, io, immediate: true });
      }
    }
  }

  reset(roomId) {
    const queue = this.getQueue(roomId);
    if (queue.debounceTimer) clearTimeout(queue.debounceTimer);
    queue.accumulator = [];
    queue.isInFlight = false;
    queue.lastFlushTime = 0;
    queue.firstChunkTime = 0;
    queue.debounceTimer = null;
    queue.lastSpeaker = null;
  }
}

export const extractionQueue = new ExtractionQueueManager();

