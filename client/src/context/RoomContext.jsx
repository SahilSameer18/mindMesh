import { useEffect, useState, useMemo, useCallback } from "react";
import { DEFAULT_ROOM_ID } from "../utils/canvasConstants.js";
import { RoomContext } from "./roomContextInstance.js";
import { useAuth } from "./AuthContext.jsx";
import { getUserColor, getUserInitials } from "../utils/colors.js";
import { roomsApi } from "../api/rooms.api.js";
import { createSocketClient } from "../api/socket.js";

export function RoomProvider({ roomId = DEFAULT_ROOM_ID, children }) {
  const { user: authUser } = useAuth();
  const [customDisplayName, setCustomDisplayName] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("mindmesh_username") || "";
    }
    return "";
  });

  const updateDisplayName = useCallback((name) => {
    const trimmed = name?.trim() || "";
    if (trimmed) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("mindmesh_username", trimmed);
      }
      setCustomDisplayName(trimmed);
    }
  }, []);

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
      const initials = getUserInitials(authUser.name || authUser.email || "User");
      return {
        id: authUser.id,
        name: authUser.name || authUser.email,
        email: authUser.email,
        role: authUser.role || "owner",
        color: getUserColor(authUser.name || authUser.email),
        avatar: initials,
        isDemo: false,
      };
    }

    // 3. User configured display name from localStorage or in-room editing
    if (customDisplayName) {
      const guestId =
        (typeof localStorage !== "undefined" && localStorage.getItem("mindmesh_userid")) ||
        `user-${Math.random().toString(36).slice(2, 8)}`;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("mindmesh_userid", guestId);
      }
      return {
        id: guestId,
        name: customDisplayName,
        role: "Member",
        color: getUserColor(customDisplayName),
        avatar: getUserInitials(customDisplayName),
        isDemo: false,
      };
    }

    // 4. Default persistent guest identity
    const guestId =
      (typeof localStorage !== "undefined" && localStorage.getItem("mindmesh_userid")) ||
      `guest-${Math.random().toString(36).slice(2, 6)}`;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("mindmesh_userid", guestId);
    }
    const guestName = `Guest ${guestId.slice(-4)}`;
    return {
      id: guestId,
      name: guestName,
      role: "Guest",
      color: getUserColor(guestId),
      avatar: getUserInitials(guestName),
      isDemo: false,
    };
  }, [authUser, customDisplayName]);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState(new Map());
  const [peerCursors, setPeerCursors] = useState(new Map());
  const [peerViewports, setPeerViewports] = useState(new Map());
  const [activePresenter, setActivePresenter] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [presenterContestError, setPresenterContestError] = useState(null);
  const [roomMode, setRoomMode] = useState("operational");
  const [systemContext, setSystemContext] = useState(null);

  // Phase 7: Meeting Commit & Report State
  const [latestMeetingReport, setLatestMeetingReport] = useState(null);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);

  // Live Spoken Transcripts State across all room participants
  const [transcripts, setTranscripts] = useState([]);

  // Synchronous socket initialization eliminates setState inside useEffect
  const [socket] = useState(() => createSocketClient());

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      // Re-join canvas room on every connect/reconnect
      socket.emit("canvas:join", { roomId, user: currentUser }, (ack) => {
        if (!ack?.success) {
          console.warn("[Socket] Join acknowledgment error:", ack?.error);
        } else {
          if (ack.activePresenter) setActivePresenter(ack.activePresenter);
          if (ack.mode) setRoomMode(ack.mode);
          if (ack.systemContext) setSystemContext(ack.systemContext);
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

    const handleCanvasInit = ({ activePresenter: initialPresenter, mode, systemContext: initialContext }) => {
      if (initialPresenter) {
        const presenterSocketId = initialPresenter.socketId || initialPresenter.presenterId;
        setActivePresenter({
          ...initialPresenter,
          socketId: presenterSocketId,
          presenterId: presenterSocketId,
        });
      }
      if (mode) setRoomMode(mode);
      if (initialContext) setSystemContext(initialContext);
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

    const handleTranscriptChunk = (chunk) => {
      if (!chunk?.text) return;
      setTranscripts((prev) => {
        if (chunk.id && prev.some((t) => t.id === chunk.id)) return prev;
        return [...prev, chunk];
      });
    };
    socket.on("transcript:chunk", handleTranscriptChunk);

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
      socket.off("transcript:chunk", handleTranscriptChunk);
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
    async (newMode, newContext) => {
      try {
        const targetContext = newContext !== undefined ? newContext : systemContext;
        const data = await roomsApi.updateMode(roomId, newMode, targetContext);
        if (data?.success) {
          setRoomMode(newMode);
          if (newContext !== undefined) setSystemContext(newContext);
        }
        return data;
      } catch (err) {
        console.error("[RoomContext] Error updating room mode:", err);
      }
    },
    [roomId, systemContext]
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
        const json = await roomsApi.commit(roomId, { title });
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
        return await roomsApi.exportReport(roomId, reportId, payload);
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
      const json = await roomsApi.getLatestReport(roomId);
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
      const json = await roomsApi.getIntegrations(roomId);
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
      roomMode,
      systemContext,
      updateRoomMode,
      updateDisplayName,
      clearPresenterContestError: () => setPresenterContestError(null),
      transcripts,
      clearTranscripts: () => setTranscripts([]),
      addTranscript: (text) => {
        const clean = text?.trim();
        if (!clean || !socket) return;
        const chunk = {
          id: `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          speaker: currentUser?.name || "You",
          userId: currentUser?.id,
          text: clean,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        socket.emit("transcript:chunk", {
          roomId,
          ...chunk,
        });
      },
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
      updateDisplayName,
      transcripts,
      systemContext,
    ]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}



