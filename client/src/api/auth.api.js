import apiClient from "./apiClient.js";

/**
 * Isolated Authentication API service.
 * Handles current session check, login, signup, refresh, session management, and logout.
 */
export const authApi = {
  /**
   * Fetch current authenticated session
   */
  async getMe() {
    return apiClient.get("/api/auth/me");
  },

  /**
   * Register a new user
   */
  async signup({ email, password, name }) {
    return apiClient.post("/api/auth/signup", { email, password, name });
  },

  /**
   * Log into an existing account
   */
  async login({ email, password }) {
    return apiClient.post("/api/auth/login", { email, password });
  },

  /**
   * Rotate access and refresh tokens
   */
  async refresh() {
    return apiClient.post("/api/auth/refresh");
  },

  /**
   * Update current user profile (e.g. name)
   */
  async updateProfile({ name }) {
    return apiClient.patch("/api/auth/me", { name });
  },

  /**
   * Log out and terminate current session
   */
  async logout() {
    return apiClient.post("/api/auth/logout");
  },

  /**
   * Log out all sessions across all devices
   */
  async logoutAll() {
    return apiClient.post("/api/auth/logout-all");
  },

  /**
   * List all active sessions
   */
  async getSessions() {
    return apiClient.get("/api/auth/sessions");
  },

  /**
   * Revoke a specific active session
   */
  async revokeSession(id) {
    return apiClient.delete(`/api/auth/sessions/${id}`);
  },
};

export default authApi;