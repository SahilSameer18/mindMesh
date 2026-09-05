import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/env.js";
import { buildExtractionSystemPrompt } from "../prompts/extraction.prompt.js";

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

export const gemini = {
  extractMeetingElements,
};