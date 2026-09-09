import apiClient from "./apiClient.js";

/**
 * Isolated Rooms & Workspaces API service.
 * Manages room lifecycle, mode updates, commit reports, and integrations.
 */
export const roomsApi = {
  /**
   * Fetch all accessible rooms/workspaces
   */
  async getAll() {
    return apiClient.get("/api/rooms");
  },

  /**
   * Fetch a single room by ID
   */
  async get(roomId) {
    return apiClient.get(`/api/rooms/${encodeURIComponent(roomId)}`);
  },

  /**
   * Create a new workspace room
   */
  async create(payload) {
    return apiClient.post("/api/rooms", payload);
  },

  /**
   * Delete a room permanently
   */
  async delete(roomId) {
    return apiClient.delete(`/api/rooms/${encodeURIComponent(roomId)}`);
  },

  /**
   * Update room operational mode (operational | brainstorm)
   */
  async updateMode(roomId, mode, systemContext = null) {
    return apiClient.patch(`/api/rooms/${encodeURIComponent(roomId)}/mode`, {
      mode,
      systemContext,
    });
  },

  /**
   * Commit room session and generate executive report
   */
  async commit(roomId, payload = {}) {
    return apiClient.post(`/api/rooms/${encodeURIComponent(roomId)}/commit`, payload);
  },

  /**
   * Export meeting report to external destinations (Slack, Notion, Email)
   */
  async exportReport(roomId, reportId, payload = {}) {
    return apiClient.post(
      `/api/rooms/${encodeURIComponent(roomId)}/reports/${encodeURIComponent(reportId)}/export`,
      payload
    );
  },

  /**
   * Fetch latest generated report for a room
   */
  async getLatestReport(roomId) {
    return apiClient.get(`/api/rooms/${encodeURIComponent(roomId)}/reports/latest`);
  },

  /**
   * Fetch connected tool integrations for a room
   */
  async getIntegrations(roomId) {
    return apiClient.get(`/api/rooms/${encodeURIComponent(roomId)}/integrations`);
  },

  /**
   * Fetch recent AI actions history for a room
   */
  async getAIActions(roomId, params = {}) {
    return apiClient.get(`/api/rooms/${encodeURIComponent(roomId)}/ai-actions`, { params });
  },

  /**
   * Approve an AI action
   */
  async approveAIAction(roomId, actionId) {
    return apiClient.post(
      `/api/rooms/${encodeURIComponent(roomId)}/ai-actions/${encodeURIComponent(actionId)}/approve`
    );
  },

  /**
   * Reject an AI action
   */
  async rejectAIAction(roomId, actionId) {
    return apiClient.post(
      `/api/rooms/${encodeURIComponent(roomId)}/ai-actions/${encodeURIComponent(actionId)}/reject`
    );
  },
};

export default roomsApi;
