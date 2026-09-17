import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

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

export function useWebRTC({ socket, roomId }) {
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

      // Tell the room our starting mic/camera state. Without this, peers only
      // ever learn about it via toggleMic/toggleCamera — so a camera that's on
      // from the moment you join (this function auto-runs on mount) never gets
      // announced, and every remote tile renders the avatar fallback forever
      // (VideoTile gates on peerMediaStates, not on whether a stream arrived).
      socket?.emit("webrtc:media-state", { roomId, isMuted: !audio, isCameraOn: video });

      return stream;
    } catch (err) {
      // Camera denied, no device, or insecure context — never crash, just
      // fall back to no local stream. The UI renders the initials avatar instead.
      console.warn("[useWebRTC] getUserMedia failed or was rejected:", err.message);
      setIsCameraOn(false);
      return null;
    }
  }, [socket, roomId]);

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

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (isCameraOn) {
      // 1. Turning camera OFF:
      // Must explicitly stop the hardware track to release the webcam sensor and turn off the laptop LED
      if (stream) {
        stream.getVideoTracks().forEach((track) => {
          track.stop();
          stream.removeTrack(track);
        });
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.kind === "video" || (s.track && s.track.kind === "video"));
          if (sender) {
            sender.replaceTrack(null).catch(() => {});
          }
        });
        const updatedStream = new MediaStream(stream.getTracks());
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);
      }
      setIsCameraOn(false);
      emitMediaState(isMuted, false);
    } else {
      // 2. Turning camera ON:
      // Re-acquire hardware camera track
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          toast.error("Camera is not supported in this browser environment");
          return;
        }

        const freshStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 30 } },
        });
        const newTrack = freshStream.getVideoTracks()[0];
        if (!newTrack) return;

        let activeStream = stream;
        if (!activeStream) {
          activeStream = new MediaStream([newTrack]);
        } else {
          activeStream.addTrack(newTrack);
        }

        // Replace track on all active peer connections
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.kind === "video" || (s.track && s.track.kind === "video"));
          if (sender) {
            sender.replaceTrack(newTrack).catch(() => {});
          } else {
            pc.addTrack(newTrack, activeStream);
          }
        });

        const updatedStream = new MediaStream(activeStream.getTracks());
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);
        setIsCameraOn(true);
        emitMediaState(isMuted, true);
      } catch (err) {
        console.warn("[useWebRTC] Failed to re-enable camera:", err.message);
        toast.error("Could not activate camera. Please check permissions.");
        setIsCameraOn(false);
        emitMediaState(isMuted, false);
      }
    }
  }, [isCameraOn, isMuted, emitMediaState]);

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

      // Fires whenever the track set changes after the initial offer/answer —
      // most commonly because getUserMedia() resolves *after* signaling already
      // completed (a real race: camera permission/hardware init is async and
      // often loses the race against the socket "peer joined" round trip).
      // startLocalMedia() retroactively calls pc.addTrack() on existing
      // connections in that case; without renegotiating here, those tracks are
      // attached locally but never actually offered to the remote peer, so
      // video/audio silently never arrives even though everything "connects".
      pc.onnegotiationneeded = async () => {
        if (isNegotiating.current.has(targetSocketId)) return;
        isNegotiating.current.add(targetSocketId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc:offer", { targetSocketId, offer });
        } catch (err) {
          console.warn("[useWebRTC] Renegotiation failed:", err.message);
        } finally {
          isNegotiating.current.delete(targetSocketId);
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
    const activePeers = peerConnections.current;
    const streamRef = localStreamRef;
    return () => {
      activePeers.forEach((pc) => pc.close());
      activePeers.clear();
      streamRef.current?.getTracks().forEach((track) => track.stop());
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
