/**
 * mindMesh — Active Command Bar Execution Engine
 * Interprets natural language commands against active canvas state,
 * coordinates spatial layout engine, queries semantic nodes, and
 * pipes all actions through the authoritative applyAIActions effector.
 */

import { withFallback } from "./providers/index.js";
import { processAIActions } from "./validation.js";
import { deduplicateAndLinkActions } from "../canvas/canvasDeduplication.js";
import { computeLayout, createMoveActionsFromLayout } from "../canvas/canvasLayout.js";
import { applyAIActions } from "./applyAIActions.js";
import { getCanvasDocument } from "../canvas/canvasDocument.js";
import { generateImageUrl, formatConceptPrompt } from "../integrations/imageGen.js";
import crypto from "crypto";

/**
 * Execute a workspace command or semantic query against a canvas room
 * @param {object} params
 * @param {string} params.roomId
 * @param {string} params.prompt - Natural language command (e.g. "Turn this into a roadmap")
 * @param {object} [params.canvasDoc] - Optional preloaded CanvasDocument
 * @param {string} [params.userId] - Requesting user ID
 * @param {Array<object>} [params.participants] - Active room participants
 * @param {string} [params.workspaceContext] - Additional room context
 * @param {object} [params.io] - Socket.io server instance for live broadcasts
 * @returns {Promise<object>} Command execution result
 */
export async function executeWorkspaceCommand({
  roomId,
  prompt,
  canvasDoc = null,
  userId = null,
  participants = [],
  workspaceContext = "",
  io = null,
} = {}) {
  if (!roomId || typeof roomId !== "string") {
    throw new Error("[executeWorkspaceCommand] roomId is required");
  }

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return {
      intent: "ANSWER_QUERY",
      summary: "Empty command prompt received.",
      answer: "Please provide a command or question for the workspace.",
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      actions: [],
      status: "idle",
    };
  }

  const trimmedPrompt = prompt.trim();
  const isImageCommand =
    trimmedPrompt.startsWith("/image ") ||
    trimmedPrompt.startsWith("/visual ");

  // Phase 7.1: Two-Phase /image Command Flow
  if (isImageCommand) {
    const rawConcept = trimmedPrompt.replace(/^(\/image|\/visual)\s+/i, "").trim();
    if (!rawConcept) {
      return {
        intent: "GENERATE_VISUAL",
        summary: "Please provide a prompt after /image, e.g. `/image system architecture`",
        answer: "Please provide a prompt after `/image`.",
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        actions: [],
        status: "idle",
      };
    }

    const doc = canvasDoc || (await getCanvasDocument(roomId));
    const state = doc.getState();
    const nodes = state.nodes || [];

    // Calculate placement offset
    let targetX = 100;
    let targetY = 100;
    if (nodes.length > 0) {
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of nodes) {
        if (n.x > maxX) maxX = n.x;
        if (n.y > maxY) maxY = n.y;
      }
      targetX = maxX + 320;
      targetY = maxY;
      if (targetX > 1400) {
        targetX = 100;
        targetY = maxY + 240;
      }
    }

    const nodeId = crypto.randomUUID();
    const commandSourceId = `cmd:img:${Date.now()}:${(userId || "user").slice(0, 8)}`;

    // Phase 1: Immediate CREATE_NODE with status: "generating"
    const createAction = {
      type: "CREATE_NODE",
      roomId,
      payload: {
        id: nodeId,
        type: "image",
        text: rawConcept,
        semanticKey: `image-${rawConcept.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`,
        x: targetX,
        y: targetY,
        metadata: {
          prompt: rawConcept,
          status: "generating",
          imageUrl: null,
          width: 320,
          height: 240,
        },
      },
      confidence: 1.0,
      reason: `Generating visual concept for: "${rawConcept}"`,
    };

    // Pipe through applyAIActions for idempotency, DB persistence, and socket broadcast
    const appliedActions = await applyAIActions(roomId, [createAction], {
      sourceId: commandSourceId,
      io,
    });

    // Phase 2: Asynchronous worker resolution
    setTimeout(async () => {
      try {
        const currentDoc = await getCanvasDocument(roomId);
        // Guard: check if node was deleted while generating (phantom node guard)
        if (!currentDoc.nodes.has(nodeId)) {
          console.info(`[commands:image] Node ${nodeId} deleted before visual resolved; aborting update.`);
          return;
        }

        const formatted = formatConceptPrompt(rawConcept);
        const imageUrl = generateImageUrl(formatted);

        const updateAction = {
          type: "UPDATE_NODE",
          roomId,
          payload: {
            id: nodeId,
            metadata: {
              prompt: rawConcept,
              status: "ready",
              imageUrl,
              width: 320,
              height: 240,
            },
          },
          confidence: 1.0,
          reason: `Resolved Pollinations.ai visual concept for: "${rawConcept}"`,
        };

        await applyAIActions(roomId, [updateAction], {
          sourceId: `${commandSourceId}:resolved`,
          io,
        });
      } catch (err) {
        console.error(`[commands:image] Failed to resolve visual for node ${nodeId}:`, err.message);
      }
    }, 50);

    return {
      intent: "GENERATE_VISUAL",
      summary: `Generating visual concept: "${rawConcept}"`,
      answer: `Visual concept initiated for: "${rawConcept}". Rendering on canvas.`,
      highlightedNodeIds: [nodeId],
      highlightedEdgeIds: [],
      actions: appliedActions,
      status: "success",
    };
  }

  // 1. Fetch authoritative active canvas state
  const doc = canvasDoc || (await getCanvasDocument(roomId));
  const state = doc.getState();
  const nodes = state.nodes || [];
  const edges = state.edges || [];

  // Sanitize and normalize prompt for whitespace and punctuation tolerance
  // (e.g. "/layout   hierarchical.", "tidy architecture!", "  /layout   tree  ")
  const normalizedPrompt = trimmedPrompt
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Fast-path: deterministic layout commands & slash shortcuts
  const isHierarchicalPhrase =
    normalizedPrompt === "/layout hierarchical" ||
    normalizedPrompt === "/layout tree" ||
    normalizedPrompt === "/layout dagre" ||
    normalizedPrompt === "tidy architecture" ||
    normalizedPrompt === "hierarchical layout" ||
    normalizedPrompt === "organize tree" ||
    normalizedPrompt === "arrange dependencies";

  const slashLayoutMatch = normalizedPrompt.match(/^\/layout\s+([a-z_-]+)$/i);

  if (isHierarchicalPhrase || slashLayoutMatch) {
    const layoutType = isHierarchicalPhrase ? "hierarchical" : slashLayoutMatch[1].toLowerCase();
    const moves = computeLayout(layoutType, nodes, edges);
    const moveActions = createMoveActionsFromLayout(roomId, moves);
    const commandSourceId = `cmd:layout:${Date.now()}:${(userId || "user").slice(0, 8)}`;
    const appliedActions = await applyAIActions(roomId, moveActions, {
      sourceId: commandSourceId,
      io,
    });

    return {
      intent: "REORGANIZE_LAYOUT",
      summary: `Reorganized workspace into ${layoutType} layout.`,
      answer: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      layoutType,
      actions: appliedActions,
      status: "success",
      provider: "deterministic",
      model: "dagre-kahn-v1",
    };
  }

  // 2. Query AI model with fallback for natural language intent
  const rawResult = await withFallback("executeCanvasCommand", {
    prompt: prompt.trim(),
    nodes,
    edges,
    participants,
    workspaceContext,
  });

  if (rawResult.status === "failed") {
    return rawResult;
  }

  const intent = rawResult.intent || "ANSWER_QUERY";
  let targetActions = [];

  // 3. Process Intent & Calculate Changes
  // Invariant: The LLM only classifies intent. 100% of spatial coordinates
  // are computed deterministically by the layout engine. The model's actions never dictate positions.
  if (intent === "REORGANIZE_LAYOUT" || rawResult.layoutType) {
    const layoutType = rawResult.layoutType || "grid";
    const moves = computeLayout(layoutType, nodes, edges);
    const moveActions = createMoveActionsFromLayout(roomId, moves);
    targetActions = [...moveActions];
  } else if (intent === "ANSWER_QUERY") {
    // Construct read-only answer record
    targetActions = [
      {
        type: "ANSWER_QUERY",
        roomId,
        payload: {
          query: prompt.trim(),
          answer: rawResult.answer || rawResult.summary,
          highlightedNodeIds: rawResult.highlightedNodeIds || [],
          highlightedEdgeIds: rawResult.highlightedEdgeIds || [],
        },
        confidence: 1.0,
        reason: rawResult.summary || "Answer to user question",
      },
    ];
  }

  // Complementary actions proposed by AI (e.g. new nodes or edits, strictly not pure layout reorganizations)
  if (intent !== "REORGANIZE_LAYOUT" && Array.isArray(rawResult.actions) && rawResult.actions.length > 0) {
    const validated = processAIActions(rawResult.actions);
    const deduplicated = deduplicateAndLinkActions(validated, nodes, edges);
    targetActions.push(...deduplicated);
  }

  // 4. Pipe actions through the authoritative persistence & broadcast effector
  const commandSourceId = `cmd:${Date.now()}:${(userId || "user").slice(0, 8)}`;
  const appliedActions = await applyAIActions(roomId, targetActions, {
    sourceId: commandSourceId,
    io,
  });

  return {
    intent,
    summary: rawResult.summary,
    answer: rawResult.answer,
    highlightedNodeIds: rawResult.highlightedNodeIds || [],
    highlightedEdgeIds: rawResult.highlightedEdgeIds || [],
    layoutType: rawResult.layoutType,
    actions: appliedActions,
    status: "success",
    provider: rawResult.provider,
    model: rawResult.model,
  };
}

