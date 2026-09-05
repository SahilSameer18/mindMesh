import { useState, useEffect, useCallback, useMemo } from "react";
import { useRoom } from "./useRoom.js";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "");

/**
 * Shared hook managing room AI action history and live events.
 * Provides in-place updates for approved/modified actions to prevent
 * chronological disruption, and a node lookup helper for Evidence cards.
 */
export function useAIActions() {
  const { socket, roomId } = useRoom();
  const [actions, setActions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial hydration from REST endpoint
  const fetchActions = useCallback(async () => {
    if (!roomId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}/ai-actions?limit=50`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setActions(json.data);
        }
      }
    } catch (err) {
      console.warn("[useAIActions] Failed to hydrate AI actions:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // 2. Real-time WebSocket Listeners with in-place update preservation
  useEffect(() => {
    if (!socket) return;

    const handleNewOrUpdatedActivity = (actionRecord) => {
      setActions((prev) => {
        const existingIdx = prev.findIndex(
          (a) =>
            a.id === actionRecord.id ||
            (a.fingerprint && actionRecord.fingerprint && a.fingerprint === actionRecord.fingerprint)
        );

        if (existingIdx !== -1) {
          // Update in-place to preserve chronological sequence
          const next = [...prev];
          next[existingIdx] = actionRecord;
          return next;
        }

        // Truly new activity: unshift to front
        return [actionRecord, ...prev];
      });
    };

    socket.on("ai:activity", handleNewOrUpdatedActivity);
    socket.on("ai:proposed", handleNewOrUpdatedActivity);
    socket.on("ai:clarify", handleNewOrUpdatedActivity);
    socket.on("ai:activity:updated", handleNewOrUpdatedActivity);

    return () => {
      socket.off("ai:activity", handleNewOrUpdatedActivity);
      socket.off("ai:proposed", handleNewOrUpdatedActivity);
      socket.off("ai:clarify", handleNewOrUpdatedActivity);
      socket.off("ai:activity:updated", handleNewOrUpdatedActivity);
    };
  }, [socket]);

  // 3. Approval and Rejection
  const approveAction = useCallback(
    (actionId) => {
      if (!socket) return;
      socket.emit("ai:action:approve", { actionId }, (ack) => {
        if (ack?.success && ack.action) {
          setActions((prev) =>
            prev.map((a) => (a.id === actionId ? ack.action : a))
          );
        }
      });
    },
    [socket]
  );

  const rejectAction = useCallback(
    (actionId) => {
      if (!socket) return;
      socket.emit("ai:action:reject", { actionId }, (ack) => {
        if (ack?.success && ack.action) {
          setActions((prev) =>
            prev.map((a) => (a.id === actionId ? ack.action : a))
          );
        }
      });
    },
    [socket]
  );

  // 4. Match an AIAction back to a canvas node
  const getActionForNode = useCallback(
    (node) => {
      if (!node) return null;

      // Direct foreign key join: node.sourceId === action.id
      if (node.sourceId) {
        const directMatch = actions.find((a) => a.id === node.sourceId);
        if (directMatch) return directMatch;
      }

      // Fallback matching: payload.id === node.id or semanticKey match
      return (
        actions.find(
          (a) =>
            a.payload?.id === node.id ||
            (node.semanticKey && a.payload?.semanticKey === node.semanticKey)
        ) || null
      );
    },
    [actions]
  );

  const proposedCount = useMemo(
    () => actions.filter((a) => a.status === "proposed" || a.status === "clarify").length,
    [actions]
  );

  return {
    actions,
    isLoading,
    proposedCount,
    approveAction,
    rejectAction,
    getActionForNode,
    refetch: fetchActions,
  };
}
