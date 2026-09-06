import { withFallback } from "./providers/index.js";
import { getCanvasDocument } from "../canvas/canvasDocument.js";
import { applyAIActions } from "./applyAIActions.js";
import { deduplicateAndLinkActions } from "../canvas/canvasDeduplication.js";
import { validateAIAction } from "./validation.js";
import { getOrCreateRoom } from "../services/room.service.js";

/**
 * Format an array of dialogue chunks into a speaker-attributed dialogue script.
 * Preserves strict FIFO arrival sequence across speaker turns.
 * @param {Array<{ speaker: string, text: string, timestamp?: string }>} chunks
 * @returns {string} Attributed dialogue transcript
 */
export function formatDialogueTranscript(chunks = []) {
  if (!Array.isArray(chunks) || chunks.length === 0) return "";
  return chunks
    .map((c) => {
      const time = c.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const speaker = c.speaker || "Participant";
      const text = (c.text || "").trim();
      return `[${time}] ${speaker}: "${text}"`;
    })
    .join("\n");
}

/**
 * Process an accumulated batch of dialogue chunks:
 * 1. Formats dialogue chronologically.
 * 2. Primes context with existing canvas entities.
 * 3. Calls AI model (Groq primary with transparent Gemini fallback).
 * 4. Deduplicates against existing cards (turning revisions into UPDATE_NODE).
 * 5. Passes actions directly to applyAIActions() for authoritative execution.
 *
 * @param {object} params
 * @param {string} params.roomId
 * @param {Array<object>} params.chunks
 * @param {string} params.sourceId
 * @param {object|null} params.io
 * @returns {Promise<object>} Result containing summary, actions, and count
 */
export async function processDialogueBatch({ roomId, chunks = [], sourceId, io = null } = {}) {
  if (!roomId) throw new Error("[extraction] roomId is required");
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return { summary: "No dialogue chunks to process", actions: [], chunksCount: 0 };
  }

  // Ensure Room record exists in PostgreSQL upfront to satisfy foreign key constraints
  await getOrCreateRoom(roomId);

  const transcript = formatDialogueTranscript(chunks);

  // 1. Query active canvas state for context priming & deduplication
  const doc = await getCanvasDocument(roomId);
  const canvasState = doc.getState();
  const existingNodes = canvasState.nodes || [];
  const existingEdges = canvasState.edges || [];

  // 2. Query participant roster dynamically from connected sockets
  let roster = [];
  if (io) {
    try {
      const sockets = await io.in(roomId).fetchSockets();
      roster = sockets.map((s) => ({
        name: s.data?.user?.name || "Collaborator",
        role: s.data?.user?.role || "Team Member",
      }));
    } catch {
      // fallback roster
      roster = [
        { name: "Elena Vance", role: "Product Lead" },
        { name: "Marcus Sterling", role: "Tech Lead" },
      ];
    }
  }

  // 3. Dual-Provider AI Extraction (Groq primary -> Gemini Flash fallback)
  const aiResult = await withFallback("extractMeetingElements", {
    transcript,
    existingNodes,
    roster,
    mode: "operational",
  });

  const rawActions = Array.isArray(aiResult?.actions) ? aiResult.actions : [];

  // 4. Schema validation & confidence routing sanitization
  const validActions = rawActions.map(validateAIAction).filter(Boolean);

  // 5. In-place deduplication & relation linking (e.g. revisions become UPDATE_NODE)
  const resolvedActions = deduplicateAndLinkActions(validActions, existingNodes, existingEdges);

  // 6. Authoritative execution through the single applyAIActions() effector pipeline
  const appliedActions = await applyAIActions(roomId, resolvedActions, { sourceId, io });

  // 7. Optional broadcast of speech extraction event
  if (io && appliedActions.length > 0) {
    io.to(roomId).emit("transcript:processed", {
      summary: aiResult.summary || "Dialogue processed",
      actionCount: appliedActions.length,
      chunksProcessed: chunks.length,
    });
  }

  return {
    summary: aiResult.summary || "Dialogue extracted",
    actions: appliedActions,
    chunksCount: chunks.length,
  };
}


