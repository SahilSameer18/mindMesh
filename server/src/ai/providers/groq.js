import Groq from "groq-sdk";
import { config } from "../../config/env.js";
import { buildExtractionSystemPrompt } from "../prompts/extraction.prompt.js";
import { buildCommandSystemPrompt } from "../prompts/command.prompt.js";

// Cache Groq client instances per API key
const clientCache = new Map();
let keyRotationIndex = 0;

function getClient() {
  const keys = config.groqApiKeys;
  if (!keys || keys.length === 0) {
    throw new Error("No Groq API keys configured. Set GROQ_API_KEYS in server/.env");
  }

  // Round-robin selection
  const activeKey = keys[keyRotationIndex % keys.length];
  keyRotationIndex = (keyRotationIndex + 1) % keys.length;

  if (!clientCache.has(activeKey)) {
    clientCache.set(activeKey, new Groq({ apiKey: activeKey }));
  }
  return { client: clientCache.get(activeKey), keyMask: activeKey.slice(0, 8) + "..." };
}

/**
 * Extract meeting elements (nodes & edges) using Groq Llama 3.3 70B
 */
export async function extractMeetingElements({ transcript, existingNodes = [], roster = [], mode = "operational", systemContext = "" } = {}) {
  const keys = config.groqApiKeys;
  const attempts = Math.max(1, keys.length);
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const { client, keyMask } = getClient();
    try {
      const systemPrompt = buildExtractionSystemPrompt({ roster, existingNodes, mode, systemContext });

      const candidateModels = [
        config.groqModel,
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
      ].filter(Boolean);

      let completion = null;
      let usedModel = config.groqModel;

      for (const model of candidateModels) {
        try {
          completion = await client.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Meeting dialogue to analyze:\n\n${transcript}` },
            ],
            response_format: { type: "json_object" },
            max_tokens: 2500,
            temperature: 0.1,
          });
          usedModel = model;
          break;
        } catch (mErr) {
          if (mErr.status === 404) {
            // Model not available on this organization; try next candidate
            continue;
          }
          throw mErr;
        }
      }

      if (!completion) {
        throw new Error("All Groq model candidates failed.");
      }

      const rawContent = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(rawContent);

      return {
        summary: parsed.summary || "Dialogue processed by Groq",
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        provider: "groq",
        model: usedModel,
        key: keyMask,
      };
    } catch (err) {
      lastError = err;
      const isRateLimit = err.status === 429 || (err.message && err.message.includes("429"));
      if (isRateLimit && attempts > 1) {
        console.warn(`[Groq] Key ${keyMask} rate limited (429). Rotating to next pooled key (attempt ${attempt + 1}/${attempts})...`);
        continue;
      }
      // Re-throw to trigger Gemini failover in withFallback
      throw err;
    }
  }

  throw lastError;
}

/**
 * Execute a workspace command or query via Groq
 */
export async function executeCanvasCommand({ prompt, nodes = [], edges = [], participants = [], workspaceContext = "" } = {}) {
  const keys = config.groqApiKeys;
  const attempts = Math.max(1, keys.length);
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const { client, keyMask } = getClient();
    try {
      const systemPrompt = buildCommandSystemPrompt({ nodes, edges, participants, workspaceContext });

      const candidateModels = [
        config.groqModel,
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
      ].filter(Boolean);

      let completion = null;
      let usedModel = config.groqModel;

      for (const model of candidateModels) {
        try {
          completion = await client.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `User Workspace Command: "${prompt}"` },
            ],
            response_format: { type: "json_object" },
            max_tokens: 2500,
            temperature: 0.1,
          });
          usedModel = model;
          break;
        } catch (mErr) {
          if (mErr.status === 404) continue;
          throw mErr;
        }
      }

      if (!completion) {
        throw new Error("All Groq model candidates failed for executeCanvasCommand.");
      }

      const rawContent = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(rawContent);

      return {
        intent: parsed.intent || "ANSWER_QUERY",
        summary: parsed.summary || `Processed command: "${prompt}"`,
        answer: parsed.answer || null,
        highlightedNodeIds: Array.isArray(parsed.highlightedNodeIds) ? parsed.highlightedNodeIds : [],
        highlightedEdgeIds: Array.isArray(parsed.highlightedEdgeIds) ? parsed.highlightedEdgeIds : [],
        layoutType: parsed.layoutType || null,
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        provider: "groq",
        model: usedModel,
        key: keyMask,
      };
    } catch (err) {
      lastError = err;
      const isRateLimit = err.status === 429 || (err.message && err.message.includes("429"));
      if (isRateLimit && attempts > 1) {
        console.warn(`[Groq] Key ${keyMask} rate limited (429) during command. Rotating key (attempt ${attempt + 1}/${attempts})...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export const groq = {
  extractMeetingElements,
  executeCanvasCommand,
};