import { useState, useRef, useEffect, useCallback } from "react";

/**
 * P2P WebRTC mesh client hook for mindMesh real-time video conference.
 * Manages Google STUN peer connections, ICE candidate buffering, local/remote media tracks,
 * and input-safe hotkeys (M = mute, V = camera).
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC({ socket, roomId, currentUserId }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [peerMediaStates, setPeerMediaStates] = useState(new Map());

  const localStreamRef = useRef(null); // mirror of localStream for use inside callbacks/listeners
  const peerConnections = useRef(new Map()); // socketId -> RTCPeerConnection
  const candidateQueues = useRef(new Map()); // socketId -> RTCIceCandidateInit[] buffered before remote description is set
  const isNegotiating = useRef(new Set()); // socketIds currently creating an offer (synchronous lock)

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // ---------- Local media ----------

  const startLocalMedia = useCallback(async ({ video = true, audio = true } = {}) => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        console.warn("[useWebRTC] getUserMedia is not supported in this environment");
        setIsCameraOn(false);
        return null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 30 } } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      setLocalStream(stream);
      setIsCameraOn(video);
      setIsMuted(!audio);

      // Attach to any peer connections that were created before media was ready
      peerConnections.current.forEach((pc) => {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      });

      return stream;
    } catch (err) {
      // Camera denied, no device, or insecure context — never crash, just
      // fall back to no local stream. The UI renders the initials avatar instead.
      console.warn("[useWebRTC] getUserMedia failed or was rejected:", err.message);
      setIsCameraOn(false);
      return null;
    }
  }, []);

  const emitMediaState = useCallback(
    (nextMuted, nextCameraOn) => {
      socket?.emit("webrtc:media-state", {
        roomId,
        isMuted: nextMuted,
        isCameraOn: nextCameraOn,
      });
    },
    [socket, roomId]
  );

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => (track.enabled = !nextMuted));
    setIsMuted(nextMuted);
    emitMediaState(nextMuted, isCameraOn);
  }, [isMuted, isCameraOn, emitMediaState]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextCameraOn = !isCameraOn;
    stream.getVideoTracks().forEach((track) => (track.enabled = nextCameraOn));
    setIsCameraOn(nextCameraOn);
    emitMediaState(isMuted, nextCameraOn);
  }, [isMuted, isCameraOn, emitMediaState]);

  // ---------- Peer connection lifecycle ----------

  const closePeer = useCallback((targetSocketId) => {
    const pc = peerConnections.current.get(targetSocketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(targetSocketId);
    }
    candidateQueues.current.delete(targetSocketId);
    isNegotiating.current.delete(targetSocketId);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(targetSocketId);
      return next;
    });
    setPeerMediaStates((prev) => {
      const next = new Map(prev);
      next.delete(targetSocketId);
      return next;
    });
  }, []);

  const getOrCreatePeer = useCallback(
    (targetSocketId) => {
      let pc = peerConnections.current.get(targetSocketId);
      if (pc) return pc;

      pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnections.current.set(targetSocketId, pc);
      candidateQueues.current.set(targetSocketId, []);

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc:ice-candidate", {
            targetSocketId,
            candidate: e.candidate,
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStreams((prev) => new Map(prev).set(targetSocketId, e.streams[0]));
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          closePeer(targetSocketId);
        }
      };

      return pc;
    },
    [socket, closePeer]
  );

  const flushCandidateQueue = useCallback(async (targetSocketId, pc) => {
    const queued = candidateQueues.current.get(targetSocketId) || [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[useWebRTC] Failed to add queued ICE candidate:", err.message);
      }
    }
    candidateQueues.current.set(targetSocketId, []);
  }, []);

  // ---------- Socket event wiring ----------

  useEffect(() => {
    if (!socket) return;

    // A peer already in the room initiates the offer to the newcomer
    const handlePeerJoined = async ({ socketId: newSocketId }) => {
      if (!newSocketId || newSocketId === socket.id) return;
      // Synchronous lock: prevents duplicate offers in the same event loop tick
      if (isNegotiating.current.has(newSocketId)) return;

      const pc = getOrCreatePeer(newSocketId);
      // Defensive negotiation guard: ignore duplicate join events if an offer is already in flight
      if (pc.signalingState !== "stable") return;

      isNegotiating.current.add(newSocketId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { targetSocketId: newSocketId, offer });
      } catch (err) {
        console.warn("[useWebRTC] Failed to create offer:", err.message);
      } finally {
        isNegotiating.current.delete(newSocketId);
      }
    };

    const handleOffer = async ({ senderSocketId, offer }) => {
      const pc = getOrCreatePeer(senderSocketId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushCandidateQueue(senderSocketId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { targetSocketId: senderSocketId, answer });
      } catch (err) {
        console.warn("[useWebRTC] Failed to handle offer:", err.message);
      }
    };

    const handleAnswer = async ({ senderSocketId, answer }) => {
      const pc = peerConnections.current.get(senderSocketId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushCandidateQueue(senderSocketId, pc);
      } catch (err) {
        console.warn("[useWebRTC] Failed to handle answer:", err.message);
      }
    };

    const handleIceCandidate = async ({ senderSocketId, candidate }) => {
      const pc = peerConnections.current.get(senderSocketId);
      // If remote description isn't set yet, buffer the candidate to prevent race conditions
      if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
        const queue = candidateQueues.current.get(senderSocketId) || [];
        queue.push(candidate);
        candidateQueues.current.set(senderSocketId, queue);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[useWebRTC] Failed to add ICE candidate:", err.message);
      }
    };

    const handlePeerLeft = ({ socketId: leftSocketId }) => {
      closePeer(leftSocketId);
    };

    const handlePeerMediaState = ({ socketId, isMuted: peerMuted, isCameraOn: peerCameraOn }) => {
      setPeerMediaStates((prev) =>
        new Map(prev).set(socketId, { isMuted: peerMuted, isCameraOn: peerCameraOn })
      );
    };

    // Dual listener guarantees WebRTC triggers whether newcomer emits presence or room join
    socket.on("presence:peer-joined", handlePeerJoined);
    socket.on("room:peer-joined", handlePeerJoined);
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);
    socket.on("webrtc:peer-left", handlePeerLeft);
    socket.on("webrtc:peer-media-state", handlePeerMediaState);

    return () => {
      socket.off("presence:peer-joined", handlePeerJoined);
      socket.off("room:peer-joined", handlePeerJoined);
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);
      socket.off("webrtc:peer-left", handlePeerLeft);
      socket.off("webrtc:peer-media-state", handlePeerMediaState);
    };
  }, [socket, getOrCreatePeer, flushCandidateQueue, closePeer]);

  // Clean up all peer connections and local tracks on unmount
  useEffect(() => {
    return () => {
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);


  return {
    localStream,
    remoteStreams, // Map<socketId, MediaStream>
    peerMediaStates, // Map<socketId, { isMuted, isCameraOn }>
    isMuted,
    isCameraOn,
    startLocalMedia,
    toggleMic,
    toggleCamera,
  };
}

export default useWebRTC;
