import apiClient from "./apiClient.js";

/**
 * Isolated AI Intelligence & Agenda API service.
 */
export const aiApi = {
  /**
   * Import and decompose meeting agenda into strategic topic pillars
   * @param {string} roomId
   * @param {string} agendaText
   */
  async generateAgenda(roomId, agendaText) {
    return apiClient.post(`/api/rooms/${encodeURIComponent(roomId)}/agenda`, {
      agendaText,
    });
  },

  /**
   * Fetch recent AI actions for the Activity Stream
   * @param {string} roomId
   * @param {object} options
   */
  async getAIActions(roomId, { limit = 50, status = null } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (status) params.set("status", String(status));
    return apiClient.get(`/api/rooms/${encodeURIComponent(roomId)}/ai-actions?${params.toString()}`);
  },

  /**
   * Approve a proposed AI action
   */
  async approveAction(roomId, actionId) {
    return apiClient.post(`/api/rooms/${encodeURIComponent(roomId)}/ai-actions/${encodeURIComponent(actionId)}/approve`);
  },

  /**
   * Reject a proposed AI action
   */
  async rejectAction(roomId, actionId) {
    return apiClient.post(`/api/rooms/${encodeURIComponent(roomId)}/ai-actions/${encodeURIComponent(actionId)}/reject`);
  },
};
