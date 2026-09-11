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

// Response Interceptor: unwrap response data directly with 401 auto-refresh mutex queue
let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => {
    // If backend returns { success, message, data }, return it directly
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || "";

    // If 401 and not already retrying, and not an auth attempt
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !url.includes("/api/auth/refresh") &&
      !url.includes("/api/auth/login") &&
      !url.includes("/api/auth/signup")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post("/api/auth/refresh");
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mindmesh:session-expired"));
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

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
