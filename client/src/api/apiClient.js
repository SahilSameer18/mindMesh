import axios from "axios";

/**
 * Single source of truth for the server API base URL.
 * Automatically resolves localhost:3000 in dev when running on Vite port 5173.
 */
export const API_BASE_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "");

/**
 * Centralized Axios instance for mindMesh.
 * Enforces session cookies (withCredentials: true) and unified response unpacking.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Response Interceptor: unwrap response data directly
apiClient.interceptors.response.use(
  (response) => {
    // If backend returns { success, message, data }, return it directly
    return response.data;
  },
  (error) => {
    // Standardize error shape conforming to unified contract
    const formattedError = {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "An unexpected network error occurred",
      errors: error.response?.data?.errors || [error.message || "Network Error"],
      status: error.response?.status || 500,
    };
    return Promise.reject(formattedError);
  }
);

export default apiClient;
