import { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";
import { DEFAULT_ROOM_ID } from "../utils/canvasConstants.js";
import { RoomContext } from "./roomContextInstance.js";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "");

function resolveUser() {
  if (typeof window === "undefined") {
    return { id: "demo-user-1", name: "Elena Vance", role: "Product Lead", color: "#38bdf8", avatar: "EV" };
  }

  const params = new URLSearchParams(window.location.search);
  const asUser = params.get("as")?.toLowerCase();

  if (asUser === "marcus") {
    return {
      id: "demo-user-2",
      name: "Marcus Sterling",
      role: "Tech Lead",
      color: "#10b981",
      avatar: "MS",
    };
  }

  return {
    id: "demo-user-1",
    name: "Elena Vance",
    role: "Product Lead",
    color: "#38bdf8",
    avatar: "EV",
  };
}

export function RoomProvider({ roomId = DEFAULT_ROOM_ID, children }) {
  const currentUser = useMemo(() => resolveUser(), []);
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
