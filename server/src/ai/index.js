/**
 * mindMesh — AI Intelligence Engine Hub
 * Coordinates provider fallback, validation, confidence routing, and canvas deduplication.
 */

import { withFallback, groq, gemini } from "./providers/index.js";
import { processAIActions, routeAction } from "./validation.js";
import { deduplicateAndLinkActions } from "../canvas/canvasDeduplication.js";

/**
 * High-level extraction pipeline:
 * Speech transcript -> LLM with fallback -> Validation & Confidence Scoring -> Canvas Deduplication & In-Place Linking
 */
export async function extractMeetingElements({
  transcript,
  existingNodes = [],
  existingEdges = [],
  roster = [],
  mode = "operational",
  systemContext = "",
} = {}) {
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return {
      summary: "Empty transcript; no actions generated.",
      actions: [],
      status: "idle",
    };
  }

  // 1. Call AI with automatic Groq -> Gemini fallback
  const rawResult = await withFallback("extractMeetingElements", {
    transcript,
    existingNodes,
    roster,
    mode,
    systemContext,
  });

  if (rawResult.status === "failed") {
    return rawResult;
  }

  // 2. Validate, sanitize, and attach confidence routing tiers (auto, proposed, clarify)
  const validatedActions = processAIActions(rawResult.actions || []);

  // 3. Deduplicate against active canvas state and resolve in-place corrections
  const finalActions = deduplicateAndLinkActions(validatedActions, existingNodes, existingEdges);

  return {
    summary: rawResult.summary,
    actions: finalActions,
    status: "success",
    provider: rawResult.provider,
    model: rawResult.model,
  };
}

import { executeWorkspaceCommand } from "./commands.js";
import {
  applyAIActions,
  approveAIAction,
  rejectAIAction,
  getRoomAIActions,
} from "./applyAIActions.js";

export {
  routeAction,
  processAIActions,
  withFallback,
  groq,
  gemini,
  executeWorkspaceCommand,
  applyAIActions,
  approveAIAction,
  rejectAIAction,
  getRoomAIActions,
};

export const ai = {
  extractMeetingElements,
  executeWorkspaceCommand,
  applyAIActions,
  approveAIAction,
  rejectAIAction,
  getRoomAIActions,
  withFallback,
  groq,
  gemini,
  routeAction,
  processAIActions,
};

export default ai;
