import { io } from "socket.io-client";
import { API_BASE_URL } from "./apiClient.js";

/**
 * Creates an authoritative Socket.io client connection to mindMesh server.
 * Uses shared API_BASE_URL and standard transports with session cookies.
 *
 * @param {Object} [options={}] - Additional socket.io options
 * @returns {import("socket.io-client").Socket}
 */
export function createSocketClient(options = {}) {
  return io(API_BASE_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    ...options,
  });
}

export const socket = null;
export default createSocketClient;
