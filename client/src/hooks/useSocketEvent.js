import { useEffect } from "react";

/**
 * Custom hook to safely attach and clean up Socket.io event listeners.
 * Eliminates repetitive useEffect + socket.on + socket.off boilerplate.
 *
 * @param {import("socket.io-client").Socket | null} socket - Socket instance
 * @param {string} eventName - Socket event name to listen to
 * @param {Function} handler - Event callback handler
 */
export function useSocketEvent(socket, eventName, handler) {
  useEffect(() => {
    if (!socket || !eventName || typeof handler !== "function") return;

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName, handler]);
}

export default useSocketEvent;
