import Groq from "groq-sdk";
import { config } from "../../config/env.js";
import { buildExtractionSystemPrompt } from "../prompts/extraction.prompt.js";
import { buildCommandSystemPrompt } from "../prompts/command.prompt.js";
import { buildMeetingCommitPrompt } from "../prompts/summary.prompt.js";

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

/**
 * Synthesize meeting commitments and canvas state into an executive report using Groq Llama 3.3 70B
 */
export async function summarizeMeeting({ transcripts = [], nodes = [], edges = [], roomMode = "operational" } = {}) {
  const keys = config.groqApiKeys;
  const attempts = Math.max(1, keys.length);
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const { client, keyMask } = getClient();
    try {
      const fullPrompt = buildMeetingCommitPrompt({ transcripts, nodes, edges, roomMode });

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
              {
                role: "system",
                content: "You are the mindMesh AI Synthesis Engine. Return only valid JSON adhering to the requested schema.",
              },
              { role: "user", content: fullPrompt },
            ],
            response_format: { type: "json_object" },
            max_tokens: 3500,
            temperature: 0.15,
          });
          usedModel = model;
          break;
        } catch (mErr) {
          if (mErr.status === 404) continue;
          throw mErr;
        }
      }

      if (!completion) {
        throw new Error("All Groq model candidates failed for summarizeMeeting.");
      }

      const rawContent = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(rawContent);

      return {
        executiveSummary: parsed.executiveSummary || "Summary of discussion and active canvas entities.",
        keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        unresolvedQuestions: Array.isArray(parsed.unresolvedQuestions) ? parsed.unresolvedQuestions : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        provider: "groq",
        model: usedModel,
        key: keyMask,
      };
    } catch (err) {
      lastError = err;
      const isRateLimit = err.status === 429 || (err.message && err.message.includes("429"));
      if (isRateLimit && attempts > 1) {
        console.warn(`[Groq] Key ${keyMask} rate limited (429) during summarize. Rotating key (attempt ${attempt + 1}/${attempts})...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Extract 3-5 strategic topic pillars from raw meeting agenda or outline text
 */
export async function extractAgendaTopics({ agendaText } = {}) {
  const keys = config.groqApiKeys;
  const attempts = Math.max(1, keys.length);
  let lastError = null;

  const prompt = `Analyze the following meeting agenda/notes and extract between 3 to 5 top-level strategic topic pillars.
Return valid JSON adhering strictly to this schema:
{
  "topics": [
    {
      "title": "Short Topic Title (Max 5 words)",
      "semanticKey": "lowercase_snake_case_key",
      "description": "One sentence expected outcome or scope"
    }
  ]
}

Meeting Agenda:
"""
${agendaText.slice(0, 4000)}
"""`;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const { client, keyMask } = getClient();
    try {
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
              {
                role: "system",
                content: "You are the mindMesh Agenda Strategic Decomposition Engine. Return only valid JSON adhering to the requested schema.",
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            max_tokens: 1500,
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
        throw new Error("All Groq model candidates failed for extractAgendaTopics.");
      }

      const rawContent = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(rawContent);

      return {
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        provider: "groq",
        model: usedModel,
        key: keyMask,
      };
    } catch (err) {
      lastError = err;
      const isRateLimit = err.status === 429 || (err.message && err.message.includes("429"));
      if (isRateLimit && attempts > 1) {
        console.warn(`[Groq] Key ${keyMask} rate limited (429) during agenda extraction. Rotating key (attempt ${attempt + 1}/${attempts})...`);
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
  summarizeMeeting,
  extractAgendaTopics,
};