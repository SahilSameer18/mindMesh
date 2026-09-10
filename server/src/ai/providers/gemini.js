import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/env.js";
import { buildExtractionSystemPrompt } from "../prompts/extraction.prompt.js";
import { buildCommandSystemPrompt } from "../prompts/command.prompt.js";
import { buildMeetingCommitPrompt } from "../prompts/summary.prompt.js";

let client = null;

function getClient() {
  if (!config.geminiApiKey) {
    throw new Error("No Gemini API key configured. Set GEMINI_API_KEYS in server/.env");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return client;
}

/**
 * Extract meeting elements (nodes & edges) using Gemini Flash as secondary/fallback
 */
export async function extractMeetingElements({ transcript, existingNodes = [], roster = [], mode = "operational", systemContext = "" } = {}) {
  const ai = getClient();
  const systemPrompt = buildExtractionSystemPrompt({ roster, existingNodes, mode, systemContext });

  const fullPrompt = `${systemPrompt}\n\nMeeting dialogue to analyze:\n\n${transcript}`;

  const candidateModels = [
    config.geminiModel,
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
  ].filter(Boolean);

  let response = null;
  let usedModel = config.geminiModel;

  for (const model of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      usedModel = model;
      break;
    } catch (mErr) {
      if (mErr.message && mErr.message.includes("404")) {
        continue;
      }
      throw mErr;
    }
  }

  if (!response) {
    throw new Error("All Gemini model candidates failed.");
  }

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText);

  return {
    summary: parsed.summary || "Dialogue processed by Gemini",
    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    provider: "gemini",
    model: usedModel,
  };
}

/**
 * Execute a workspace command or query via Gemini
 */
export async function executeCanvasCommand({ prompt, nodes = [], edges = [], participants = [], workspaceContext = "" } = {}) {
  const ai = getClient();
  const systemPrompt = buildCommandSystemPrompt({ nodes, edges, participants, workspaceContext });
  const fullPrompt = `${systemPrompt}\n\nUser Workspace Command: "${prompt}"`;

  const candidateModels = [
    config.geminiModel,
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
  ].filter(Boolean);

  let response = null;
  let usedModel = config.geminiModel;

  for (const model of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      usedModel = model;
      break;
    } catch (mErr) {
      if (mErr.message && mErr.message.includes("404")) {
        continue;
      }
      throw mErr;
    }
  }

  if (!response) {
    throw new Error("All Gemini model candidates failed for executeCanvasCommand.");
  }

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText);

  return {
    intent: parsed.intent || "ANSWER_QUERY",
    summary: parsed.summary || `Processed command: "${prompt}"`,
    answer: parsed.answer || null,
    highlightedNodeIds: Array.isArray(parsed.highlightedNodeIds) ? parsed.highlightedNodeIds : [],
    highlightedEdgeIds: Array.isArray(parsed.highlightedEdgeIds) ? parsed.highlightedEdgeIds : [],
    layoutType: parsed.layoutType || null,
    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    provider: "gemini",
    model: usedModel,
  };
}

/**
 * Synthesize meeting commitments and canvas state into an executive report using Gemini Flash
 */
export async function summarizeMeeting({ transcripts = [], nodes = [], edges = [], roomMode = "operational" } = {}) {
  const ai = getClient();
  const fullPrompt = buildMeetingCommitPrompt({ transcripts, nodes, edges, roomMode });

  const candidateModels = [
    config.geminiModel,
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
  ].filter(Boolean);

  let response = null;
  let usedModel = config.geminiModel;

  for (const model of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.15,
        },
      });
      usedModel = model;
      break;
    } catch (mErr) {
      if (mErr.message && mErr.message.includes("404")) {
        continue;
      }
      throw mErr;
    }
  }

  if (!response) {
    throw new Error("All Gemini model candidates failed for summarizeMeeting.");
  }

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText);

  return {
    executiveSummary: parsed.executiveSummary || "Summary of discussion and active canvas entities.",
    keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    unresolvedQuestions: Array.isArray(parsed.unresolvedQuestions) ? parsed.unresolvedQuestions : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    provider: "gemini",
    model: usedModel,
  };
}

/**
 * Extract 3-5 strategic topic pillars from raw meeting agenda using Gemini Flash
 */
export async function extractAgendaTopics({ agendaText } = {}) {
  const ai = getClient();
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

  const candidateModels = [
    config.geminiModel,
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
  ].filter(Boolean);

  let response = null;
  let usedModel = config.geminiModel;

  for (const model of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      usedModel = model;
      break;
    } catch (mErr) {
      if (mErr.message && mErr.message.includes("404")) {
        continue;
      }
      throw mErr;
    }
  }

  if (!response) {
    throw new Error("All Gemini model candidates failed for extractAgendaTopics.");
  }

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText);

  return {
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    provider: "gemini",
    model: usedModel,
  };
}

export const gemini = {
  extractMeetingElements,
  executeCanvasCommand,
  summarizeMeeting,
  extractAgendaTopics,
};
