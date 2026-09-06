import { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";
import { DEFAULT_ROOM_ID } from "../utils/canvasConstants.js";
import { RoomContext } from "./roomContextInstance.js";
import { useAuth } from "./AuthContext.jsx";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "");

export function RoomProvider({ roomId = DEFAULT_ROOM_ID, children }) {
  const { user: authUser } = useAuth();

  const currentUser = useMemo(() => {
    // 1. Explicit query parameter override (highest priority for multi-tab developer demos)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const asUser = params.get("as")?.toLowerCase();

      if (asUser === "marcus") {
        return {
          id: "demo-user-2",
          name: "Marcus Sterling",
          role: "Tech Lead",
          color: "#06b6d4",
          avatar: "MS",
          isDemo: true,
        };
      }

      if (asUser === "elena") {
        return {
          id: "demo-user-1",
          name: "Elena Vance",
          role: "Product Lead",
          color: "#8b5cf6",
          avatar: "EV",
          isDemo: true,
        };
      }
    }

    // 2. Real authenticated session from AuthContext
    if (authUser && !authUser.isDemo) {
      const initials = (authUser.name || authUser.email || "U")
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

      return {
        id: authUser.id,
        name: authUser.name || authUser.email,
        email: authUser.email,
        role: authUser.role || "owner",
        color: "#8b5cf6",
        avatar: initials,
        isDemo: false,
      };
    }

    // 3. Fallback guest identity (zero-login barrier)
    return {
      id: "demo-user-1",
      name: "Elena Vance",
      role: "Product Lead",
      color: "#8b5cf6",
      avatar: "EV",
      isDemo: true,
    };
  }, [authUser]);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState(new Map());

  // Synchronous socket initialization eliminates setState inside useEffect
  const [socket] = useState(() =>
    io(SOCKET_SERVER_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
    })
  );

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      // Re-join canvas room on every connect/reconnect
      socket.emit("canvas:join", { roomId, user: currentUser }, (ack) => {
        if (!ack?.success) {
          console.warn("[Socket] Join acknowledgment error:", ack?.error);
        }
      });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (err) => {
      console.warn("[Socket] Connection error:", err.message);
      setIsConnected(false);
    };

    const handlePeerJoined = ({ user, socketId }) => {
      if (!socketId) return;
      setPeers((prev) => {
        const next = new Map(prev);
        next.set(socketId, { user, socketId });
        return next;
      });
    };

    const handlePeerLeft = ({ socketId }) => {
      if (!socketId) return;
      setPeers((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("presence:peer-joined", handlePeerJoined);
    socket.on("presence:peer-left", handlePeerLeft);

    // If socket is already connected when effect mounts
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("presence:peer-joined", handlePeerJoined);
      socket.off("presence:peer-left", handlePeerLeft);
      socket.emit("canvas:leave");
    };
  }, [socket, roomId, currentUser]);

  // Re-run Socket.io HTTP handshake when auth status changes (login, signup, logout)
  // Ensures socket.data.user reflects the fresh JWT cookie on the server
  useEffect(() => {
    if (!socket) return;
    const handleAuthChanged = () => {
      socket.disconnect();
      socket.connect();
    };

    window.addEventListener("mindmesh:auth-changed", handleAuthChanged);
    return () => {
      window.removeEventListener("mindmesh:auth-changed", handleAuthChanged);
    };
  }, [socket]);

  const value = useMemo(
    () => ({
      roomId,
      socket,
      currentUser,
      isConnected,
      peers: Array.from(peers.values()),
    }),
    [roomId, socket, currentUser, isConnected, peers]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}



