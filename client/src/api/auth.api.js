import apiClient from "./apiClient.js";

/**
 * Isolated Authentication API service.
 * Handles current session check, login, signup, profile updates, and logout.
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
   * Update current user profile (e.g. name)
   */
  async updateProfile({ name }) {
    return apiClient.patch("/api/auth/me", { name });
  },

  /**
   * Log out and terminate session cookie
   */
  async logout() {
    return apiClient.post("/api/auth/logout");
  },
};

export default authApi;