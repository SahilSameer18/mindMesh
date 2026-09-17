import { useState, useEffect, useRef } from "react";
import { useWebRTC } from "../../hooks/useWebRTC.js";
import { useRoom } from "../../hooks/useRoom.js";
import { Mic, MicOff, Video, VideoOff, Users, ChevronDown, ChevronUp, GripHorizontal } from "lucide-react";

/**
 * Functional P2P Video Conference Bar.
 * Renders local & remote WebRTC video tiles with zero-CPU track status indicators,
 * ambient avatar fallbacks, adaptive 1-to-4 layout, and a non-overlapping draggable dock.
 */

function getInitials(name = "?") {
  return name
    .trim()
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function VideoTile({ stream, name, isMuted, isCameraOn, isLocal, color, isCompact = false }) {
  const videoRef = useRef(null);

  const showVideo = Boolean(isCameraOn && stream);
  const displayName = isLocal ? "You" : name || "Collaborator";

  useEffect(() => {
    if (videoRef.current && stream && showVideo) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, showVideo]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-subtle shrink-0 select-none ${
        isCompact ? "w-28 h-20" : "w-36 h-24"
      }`}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-white">
          <div
            className={`rounded-full flex items-center justify-center font-bold shadow-subtle border border-white/20 ${
              isCompact ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
            }`}
            style={{ backgroundColor: color || (isLocal ? "#0284c7" : "#059669") }}
          >
            {getInitials(name)}
          </div>
        </div>
      )}

      {/* Name and Mute Status Overlay */}
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-white">
        <span className="truncate max-w-[70px] font-medium leading-none">
          {displayName}
        </span>
        {isMuted ? (
          <span className="flex items-center text-rose-400 font-semibold shrink-0">
            <MicOff className="w-2.5 h-2.5" />
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        )}
      </div>
    </div>
  );
}

export default function VideoConferenceBar({
  roomId: propRoomId,
  currentUser: propCurrentUser,
  peers: propPeers,
}) {
  const room = useRoom();

  const socket = room?.socket;
  const roomId = propRoomId || room?.roomId;
  const currentUser = propCurrentUser || room?.currentUser;
  const peers = propPeers || room?.peers || [];

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [position, setPosition] = useState(null); // null = use default non-overlapping CSS position
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, startX: 0, startY: 0 });

  const {
    localStream,
    remoteStreams,
    peerMediaStates,
    isMuted,
    isCameraOn,
    startLocalMedia,
    toggleMic,
    toggleCamera,
  } = useWebRTC({
    socket,
    roomId,
  });

  useEffect(() => {
    // Automatically initialize audio/video on mount
    startLocalMedia({ video: true, audio: true });
  }, [startLocalMedia]);

  // Pointer drag handling for floating the dock anywhere on screen
  const handlePointerDown = (e) => {
    if (e.target.closest("button") || e.target.closest("video") || e.target.closest("input")) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();

    isDraggingRef.current = true;
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: rect.left,
      startY: rect.top,
    };

    container.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;

    const newX = Math.max(16, Math.min(window.innerWidth - 240, dragStartRef.current.startX + deltaX));
    const newY = Math.max(64, Math.min(window.innerHeight - 120, dragStartRef.current.startY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  if (!socket) return null;

  const totalParticipants = 1 + peers.length;
  const isMultiPeer = totalParticipants > 2;

  const containerStyle = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : undefined;

  // Non-overlapping default position: bottom-6 left-44 (clear of both zoom controls and left toolbar)
  const positionClass = position ? "fixed z-40" : "fixed bottom-20 left-4 sm:bottom-6 sm:left-44 z-40 max-w-[calc(100vw-2rem)]";

  // Collapsed Mode: Micro-pill
  if (isCollapsed) {
    return (
      <div
        style={containerStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`${positionClass} flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 text-white shadow-elevated backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-auto cursor-grab active:cursor-grabbing select-none`}
      >
        <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0 ml-0.5" />
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold cursor-pointer transition-colors"
          title="Expand Video Call"
        >
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>{totalParticipants} in call</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          type="button"
          onClick={toggleMic}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isMuted ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isCameraOn ? "bg-sky-600 hover:bg-sky-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
          }`}
          title={isCameraOn ? "Turn camera off" : "Turn camera on"}
          aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
        >
          {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Expand video tiles"
          aria-label="Expand video tiles"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Expanded Mode: Adaptive 1, 2, or 2x2 grid dock
  return (
    <div
      style={containerStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`${positionClass} flex flex-col gap-2 p-2 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 text-white shadow-elevated backdrop-blur-xl transition-shadow duration-200 animate-in fade-in zoom-in-95 select-none pointer-events-auto cursor-grab active:cursor-grabbing`}
    >
      {/* Dock Header with Drag Grip */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-zinc-200 text-[11px]">Video Chat</span>
          <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[9px] font-mono text-zinc-400">
            {totalParticipants}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Collapse to pill"
          aria-label="Collapse to pill"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video Tiles Grid: Adaptive 1, 2, or 2x2 layout */}
      <div
        className={
          isMultiPeer
            ? "grid grid-cols-2 gap-1.5 max-w-[240px] max-h-[50vh] overflow-y-auto"
            : "flex items-center gap-1.5 max-w-[calc(100vw-3rem)] overflow-x-auto"
        }
      >
        {/* Local User Tile */}
        <VideoTile
          stream={localStream}
          name={currentUser?.name}
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          isLocal
          color={currentUser?.color}
          isCompact={isMultiPeer}
        />

        {/* Remote Peer Tiles */}
        {peers.map((peer) => {
          const peerName = peer.user?.name || peer.name || "Collaborator";
          const peerColor = peer.user?.color || peer.color;
          const mediaState = peerMediaStates.get(peer.socketId);

          return (
            <VideoTile
              key={peer.socketId}
              stream={remoteStreams.get(peer.socketId)}
              name={peerName}
              isMuted={mediaState?.isMuted ?? false}
              isCameraOn={mediaState?.isCameraOn ?? false}
              color={peerColor}
              isCompact={isMultiPeer}
            />
          );
        })}
      </div>

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 gap-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMic}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isMuted
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-emerald-400" />}
            <span>{isMuted ? "Muted" : "Mute"}</span>
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isCameraOn
                ? "bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700"
            }`}
            title={isCameraOn ? "Turn camera off" : "Turn camera on"}
            aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {isCameraOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3 text-zinc-400" />}
            <span>{isCameraOn ? "Cam On" : "Cam Off"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="text-[10px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Collapse
        </button>
      </div>
    </div>
  );
}
