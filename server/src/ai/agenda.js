/**
 * mindMesh — Agenda Strategic Decomposition Engine
 * Transforms raw pasted meeting agendas into strategic topic pillars using dual-engine AI.
 */

import { withFallback } from "./providers/index.js";

/**
 * Extract 3-5 top-level strategic topic pillars from raw meeting agenda text
 * @param {string} agendaText
 * @returns {Promise<{ topics: Array<{ title: string, semanticKey: string, description: string }>, provider: string }>}
 */
export async function extractAgendaTopics(agendaText) {
  if (!agendaText || typeof agendaText !== "string" || agendaText.trim().length < 15) {
    throw new Error("Agenda text is too short to extract topics (minimum 15 characters required).");
  }

  const result = await withFallback("extractAgendaTopics", { agendaText: agendaText.trim() });
  return result;
}

