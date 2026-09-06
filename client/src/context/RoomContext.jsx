import { useEffect, useState, useMemo, useCallback } from "react";
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
  const [peerCursors, setPeerCursors] = useState(new Map());
  const [peerViewports, setPeerViewports] = useState(new Map());
  const [activePresenter, setActivePresenter] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [presenterContestError, setPresenterContestError] = useState(null);
  const [roomMode, setRoomMode] = useState("operational");

  // Phase 7: Meeting Commit & Report State
  const [latestMeetingReport, setLatestMeetingReport] = useState(null);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);

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
        } else if (ack.activePresenter) {
          setActivePresenter(ack.activePresenter);
        }
      });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setActivePresenter(null);
      setIsFollowing(false);
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
      setPeerCursors((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setPeerViewports((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setActivePresenter((prev) =>
        prev?.socketId === socketId || prev?.presenterId === socketId ? null : prev
      );
    };

    const handleCursorMoved = ({ socketId, user, x, y, timestamp }) => {
      if (!socketId || socketId === socket.id) return;
      setPeerCursors((prev) => {
        const next = new Map(prev);
        next.set(socketId, { socketId, user, x, y, timestamp: timestamp || Date.now() });
        return next;
      });
    };

    const handleViewportUpdated = ({ socketId, user, viewport }) => {
      if (!socketId || socketId === socket.id) return;
      setPeerViewports((prev) => {
        const next = new Map(prev);
        next.set(socketId, { socketId, user, viewport });
        return next;
      });
    };

    const handlePresenterStarted = (data) => {
      const presenterSocketId = data?.socketId || data?.presenterId;
      setActivePresenter({
        socketId: presenterSocketId,
        presenterId: presenterSocketId,
        user: data?.user,
        startedAt: data?.startedAt,
      });
      // Following is strictly an opt-in viewer action via WorkspaceHeader "Follow [Name]" button.
      // Do NOT auto-set isFollowing to true to avoid yanking viewer viewports without consent.
    };

    const handlePresenterStopped = () => {
      setActivePresenter(null);
      setIsFollowing(false);
    };

    const handleCanvasInit = ({ activePresenter: initialPresenter }) => {
      if (initialPresenter) {
        const presenterSocketId = initialPresenter.socketId || initialPresenter.presenterId;
        setActivePresenter({
          ...initialPresenter,
          socketId: presenterSocketId,
          presenterId: presenterSocketId,
        });
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("canvas:init", handleCanvasInit);
    socket.on("presence:peer-joined", handlePeerJoined);
    socket.on("presence:peer-left", handlePeerLeft);
    socket.on("cursor:moved", handleCursorMoved);
    socket.on("presence:viewport-updated", handleViewportUpdated);
    socket.on("presenter:started", handlePresenterStarted);
    socket.on("presenter:stopped", handlePresenterStopped);

    const handleMeetingCommitted = (report) => {
      setLatestMeetingReport(report);
    };
    socket.on("meeting:committed", handleMeetingCommitted);

    // If socket is already connected when effect mounts
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("canvas:init", handleCanvasInit);
      socket.off("presence:peer-joined", handlePeerJoined);
      socket.off("presence:peer-left", handlePeerLeft);
      socket.off("cursor:moved", handleCursorMoved);
      socket.off("presence:viewport-updated", handleViewportUpdated);
      socket.off("presenter:started", handlePresenterStarted);
      socket.off("presenter:stopped", handlePresenterStopped);
      socket.off("meeting:committed", handleMeetingCommitted);
      socket.emit("canvas:leave");
    };
  }, [socket, roomId, currentUser]);

  // Presenter actions
  const startPresenting = useCallback((callback) => {
    if (!socket) return;
    socket.emit("presenter:start", (res) => {
      if (res?.success) {
        const presenterSocketId = res.presenter?.socketId || res.presenter?.presenterId;
        setActivePresenter({
          ...res.presenter,
          socketId: presenterSocketId,
          presenterId: presenterSocketId,
        });
        setPresenterContestError(null);
        setIsFollowing(false);
        if (typeof callback === "function") callback(res);
      } else if (res?.code === "PRESENTER_BUSY") {
        setPresenterContestError(res.message || "Another participant is currently presenting");
        setTimeout(() => setPresenterContestError(null), 3500);
        if (typeof callback === "function") callback(res);
      }
    });
  }, [socket]);

  const stopPresenting = useCallback((callback) => {
    if (!socket) return;
    socket.emit("presenter:stop", (res) => {
      setActivePresenter(null);
      if (typeof callback === "function") callback(res);
    });
  }, [socket]);

  const setFollowing = useCallback((val) => {
    setIsFollowing(Boolean(val));
  }, []);

  const updateRoomMode = useCallback(
    async (newMode, systemContext) => {
      try {
        const res = await fetch(`${SOCKET_SERVER_URL}/api/rooms/${roomId}/mode`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ mode: newMode, systemContext }),
        });
        const data = await res.json();
        if (data?.success) {
          setRoomMode(newMode);
        }
        return data;
      } catch (err) {
        console.error("[RoomContext] Error updating room mode:", err);
      }
    },
    [roomId]
  );

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

  const commitMeeting = useCallback(
    async ({ title } = {}) => {
      setIsCommitting(true);
      setCommitError(null);
      try {
        const res = await fetch(`${SOCKET_SERVER_URL}/api/rooms/${roomId}/commit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title }),
        });
        const json = await res.json();
        if (json?.success && json?.data) {
          setLatestMeetingReport(json.data);
          setCommitError(null);
          return json.data;
        } else {
          const errMsg = json?.message || "Failed to commit meeting";
          setCommitError(errMsg);
          throw new Error(errMsg);
        }
      } catch (err) {
        console.error("[RoomContext] Commit meeting error:", err);
        setCommitError(err.message || "Failed to commit meeting");
        throw err;
      } finally {
        setIsCommitting(false);
      }
    },
    [roomId]
  );

  const exportReport = useCallback(
    async (reportId, payload) => {
      try {
        const res = await fetch(
          `${SOCKET_SERVER_URL}/api/rooms/${roomId}/reports/${reportId}/export`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );
        return await res.json();
      } catch (err) {
        console.error("[RoomContext] Export report error:", err);
        return {
          success: false,
          message: err.message || "Failed to export report",
        };
      }
    },
    [roomId]
  );

  const fetchLatestReport = useCallback(async () => {
    try {
      const res = await fetch(`${SOCKET_SERVER_URL}/api/rooms/${roomId}/reports/latest`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json?.success && json?.data) {
        setLatestMeetingReport(json.data);
        return json.data;
      }
      return null;
    } catch (err) {
      console.error("[RoomContext] Fetch latest report error:", err);
      return null;
    }
  }, [roomId]);

  const fetchRoomIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`${SOCKET_SERVER_URL}/api/rooms/${roomId}/integrations`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        return json.data;
      }
      return [];
    } catch (err) {
      console.error("[RoomContext] Fetch room integrations error:", err);
      return [];
    }
  }, [roomId]);

  const value = useMemo(
    () => ({
      roomId,
      socket,
      currentUser,
      isConnected,
      peers: Array.from(peers.values()),
      peerCursors: Array.from(peerCursors.values()),
      peerViewports: Array.from(peerViewports.values()),
      activePresenter,
      isFollowing,
      presenterContestError,
      roomMode,
      latestMeetingReport,
      setLatestMeetingReport,
      isCommitModalOpen,
      setIsCommitModalOpen,
      isCommitting,
      commitError,
      setCommitError,
      commitMeeting,
      exportReport,
      fetchLatestReport,
      fetchRoomIntegrations,
      startPresenting,
      stopPresenting,
      setFollowing,
      updateRoomMode,
      clearPresenterContestError: () => setPresenterContestError(null),
    }),
    [
      roomId,
      socket,
      currentUser,
      isConnected,
      peers,
      peerCursors,
      peerViewports,
      activePresenter,
      isFollowing,
      presenterContestError,
      roomMode,
      latestMeetingReport,
      isCommitModalOpen,
      isCommitting,
      commitError,
      commitMeeting,
      exportReport,
      fetchLatestReport,
      fetchRoomIntegrations,
      startPresenting,
      stopPresenting,
      setFollowing,
      updateRoomMode,
    ]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}



