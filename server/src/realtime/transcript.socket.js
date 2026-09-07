import { extractionQueue, isConversationalFiller } from "../ai/extractionQueue.js";
import { processDialogueBatch } from "../ai/extraction.js";

/**
 * Register real-time speech and transcript socket handlers
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export function setupTranscriptSocketHandlers(io, socket) {
  /**
   * Receive a real-time transcript or speech chunk from client microphone or simulator
   */
  socket.on("transcript:chunk", async (payload, callback) => {
    try {
      const roomId = payload?.roomId || socket.data?.roomId;
      const text = (payload?.text || payload?.chunk?.text)?.trim();

      if (!roomId || !text) {
        if (typeof callback === "function") {
          callback({ success: false, error: "roomId and text are required" });
        }
        return;
      }

      const chunk = {
        id: payload?.id || payload?.chunk?.id || `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        speaker: payload?.speaker || payload?.chunk?.speaker || socket.data?.user?.name || "Participant",
        userId: payload?.userId || payload?.chunk?.userId || socket.data?.user?.id || null,
        text,
        timestamp: payload?.timestamp || payload?.chunk?.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      // 1. Check if utterance is pure conversational filler
      const isFiller = isConversationalFiller(text);

      // 2. Broadcast live speech chunk to all room members for real-time captions / subtitles
      io.to(roomId).emit("transcript:chunk", {
        ...chunk,
        isFiller,
      });

      // 3. If filler, discard before queuing to save API quota
      if (isFiller) {
        if (typeof callback === "function") {
          callback({ success: true, queued: false, reason: "filler_discarded" });
        }
        return;
      }

      // 4. Enqueue non-filler chunk into the single-flight coalescing queue
      const enqueueResult = extractionQueue.enqueue(roomId, chunk, {
        onFlush: processDialogueBatch,
        io,
      });

      if (typeof callback === "function") {
        callback({
          success: true,
          queued: !enqueueResult.dropped,
          queuedCount: enqueueResult.queuedCount,
        });
      }
    } catch (err) {
      console.error("[transcript.socket] Error handling transcript chunk:", err.message);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });

  /**
   * Force flush current room dialogue buffer (e.g. speaker pressed stop or step completed)
   */
  socket.on("transcript:flush", async (payload, callback) => {
    try {
      const roomId = payload?.roomId || socket.data?.roomId;
      if (!roomId) {
        if (typeof callback === "function") callback({ success: false, error: "roomId required" });
        return;
      }

      const result = await extractionQueue.flush(roomId, {
        onFlush: processDialogueBatch,
        io,
      });

      if (typeof callback === "function") {
        callback({ success: true, result });
      }
    } catch (err) {
      console.error("[transcript.socket] Error flushing queue:", err.message);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });

  /**
   * Reset room dialogue queue
   */
  socket.on("transcript:reset", (payload, callback) => {
    const roomId = payload?.roomId || socket.data?.roomId;
    if (roomId) {
      extractionQueue.reset(roomId);
    }
    if (typeof callback === "function") {
      callback({ success: true });
    }
  });
}

