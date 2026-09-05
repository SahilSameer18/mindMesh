import { groq } from "./groq.js";
import { gemini } from "./gemini.js";

const primary = groq;
const fallback = gemini;

export function shouldFallback(error) {
  if (!error) return false;
  const status = error.status || error.code || error.statusCode;
  const msg = (error.message || "").toLowerCase();
  const name = error.name || "";

  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    status === "ETIMEDOUT" ||
    status === "ECONNRESET" ||
    name === "SyntaxError" ||
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("overloaded") ||
    msg.includes("json") ||
    msg.includes("unexpected token") ||
    msg.includes("truncated")
  );
}

/**
 * Executes an AI provider method with seamless fallback on rate limits or server spikes
 */
export async function withFallback(methodName, ...args) {
  try {
    if (typeof primary[methodName] !== "function") {
      throw new Error(`AI primary provider does not implement method: ${methodName}`);
    }
    return await primary[methodName](...args);
  } catch (error) {
    if (shouldFallback(error)) {
      console.warn(`[AI Failover] Primary provider (Groq) hit ${error.status || error.code || "rate-limit"}: ${error.message}`);
      console.info(`[AI Failover] Seamlessly routing request to secondary provider (Gemini Flash)...`);
      try {
        if (typeof fallback[methodName] !== "function") {
          throw new Error(`AI fallback provider does not implement method: ${methodName}`);
        }
        return await fallback[methodName](...args);
      } catch (fallbackError) {
        console.error(`[AI Failover] Both primary and fallback AI providers failed:`, fallbackError.message);
        return {
          actions: [],
          summary: "AI temporarily unavailable",
          status: "failed",
          error: fallbackError.message,
        };
      }
    }
    throw error;
  }
}

export async function executeCanvasCommand(args) {
  return await withFallback("executeCanvasCommand", args);
}

export { groq, gemini };

