/**
 * mindMesh — Pollinations.ai Generative Imagery Service
 * Free, zero-key visual concept generation for brainstorming and diagrammatic concepts.
 */

const MAX_PROMPT_LENGTH = 400;

/**
 * Format and enrich a raw topic into a high-aesthetic digital concept prompt
 * @param {string} topic
 * @param {string} [context]
 * @returns {string} Enriched prompt
 */
export function formatConceptPrompt(topic = "", context = "") {
  if (!topic || typeof topic !== "string") return "modern minimalist digital workspace concept";
  const cleanTopic = topic.trim();

  // If already styled, return directly
  if (cleanTopic.toLowerCase().includes("illustration") || cleanTopic.toLowerCase().includes("diagram")) {
    return cleanTopic.slice(0, MAX_PROMPT_LENGTH);
  }

  const contextStr = context ? ` (${context.trim()})` : "";
  const enriched = `clean minimalist vector illustration, modern digital interface concept diagram: ${cleanTopic}${contextStr}`;
  return enriched.slice(0, MAX_PROMPT_LENGTH);
}

/**
 * Builds a valid Pollinations.ai Flux generation URL
 * @param {string} prompt - Raw or enriched prompt
 * @param {object} [options]
 * @param {number} [options.width=1024]
 * @param {number} [options.height=768]
 * @param {number} [options.seed]
 * @param {string} [options.model="flux"]
 * @param {boolean} [options.nologo=true]
 * @returns {string} Complete image URL
 */
export function generateImageUrl(prompt = "", options = {}) {
  const cleanPrompt = (prompt || "workspace concept").trim().slice(0, MAX_PROMPT_LENGTH);
  const width = options.width || 1024;
  const height = options.height || 768;
  const seed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 1000000);
  const model = options.model || "flux";
  const nologo = options.nologo !== false;

  const encoded = encodeURIComponent(cleanPrompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=${nologo}&model=${model}`;
}

export const imageGenIntegration = {
  formatConceptPrompt,
  generateImageUrl,
};

export default imageGenIntegration;

