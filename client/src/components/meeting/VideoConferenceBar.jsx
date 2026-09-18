import { useState, useEffect, useRef } from "react";
import { useWebRTC } from "../../hooks/useWebRTC.js";
import { useRoom } from "../../hooks/useRoom.js";
import { getUserInitials } from "../../utils/colors.js";
import { Mic, MicOff, Video, VideoOff, Users, ChevronDown, GripHorizontal, GripVertical } from "lucide-react";

/**
 * Functional P2P Video Conference Bar.
 * Renders local & remote WebRTC video tiles with zero-CPU track status indicators,
 * ambient avatar fallbacks, adaptive 1-to-4 layout, and a non-overlapping draggable dock.
 */

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
      className={`relative rounded-xl overflow-hidden bg-[#0B0906] border border-[#F3ECDD]/10 flex items-center justify-center shadow-subtle shrink-0 select-none ${
        isCompact ? "w-24 h-16" : "w-28 h-20"
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
              isCompact ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"
            }`}
            style={{ backgroundColor: color || (isLocal ? "#A8542E" : "#059669") }}
          >
            {getUserInitials(name)}
          </div>
        </div>
      )}

      {/* Name and Mute Status Overlay */}
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-white">
        <span className="truncate max-w-[50px] font-medium leading-none">
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

  // Default expanded only on genuinely spacious desktops — below that, the Active
  // Command Bar shares this same bottom strip and needs the room (see ActiveCommandBar).
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1536;
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

  // Default position: a vertical dock at the top of the left rail — it's the element
  // that actually grows with peer count, so it gets room to expand downward rather
  // than a fixed slot. The canvas tools dock anchors from the bottom instead, since
  // it's fixed-size. Mobile keeps its own safe bottom-row spot since a vertical dock
  // there would eat too much of a short viewport. Always draggable.
  const positionClass = position ? "fixed z-40" : "fixed bottom-20 left-4 sm:bottom-auto sm:top-20 sm:left-4 z-40 max-w-[calc(100vw-2rem)]";

  // Collapsed Mode: Micro-pill
  if (isCollapsed) {
    return (
      <div
        style={containerStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`${positionClass} flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-[#14110C]/95 border border-[#F3ECDD]/10 text-[#F3ECDD] shadow-elevated backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-auto cursor-grab active:cursor-grabbing select-none`}
      >
        <GripVertical className="w-3.5 h-3.5 text-[#8A8478] shrink-0" />

        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl bg-[#1C1812] hover:bg-[#242019] cursor-pointer transition-colors"
          title={`Expand Video Call — ${totalParticipants} in call`}
        >
          <Users className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-mono font-semibold">{totalParticipants}</span>
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          type="button"
          onClick={toggleMic}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isMuted ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-[#1C1812] hover:bg-[#242019] text-[#8A8478]"
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
            isCameraOn ? "bg-accent hover:bg-accent-hover text-white" : "bg-[#1C1812] hover:bg-[#242019] text-[#8A8478]"
          }`}
          title={isCameraOn ? "Turn camera off" : "Turn camera on"}
          aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
        >
          {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-lg text-[#8A8478] hover:text-[#F3ECDD] hover:bg-[#1C1812] transition-colors cursor-pointer"
          title="Expand video tiles"
          aria-label="Expand video tiles"
        >
          <ChevronDown className="w-3.5 h-3.5" />
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
      className={`${positionClass} flex flex-col gap-2 p-2 rounded-2xl bg-[#14110C]/95 border border-[#F3ECDD]/10 text-[#F3ECDD] shadow-elevated backdrop-blur-xl transition-shadow duration-200 animate-in fade-in zoom-in-95 select-none pointer-events-auto cursor-grab active:cursor-grabbing`}
    >
      {/* Dock Header with Drag Grip */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-[#F3ECDD]/10 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-[#8A8478] shrink-0" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="px-1.5 py-0.2 rounded-full bg-[#1C1812] text-[9px] font-mono text-[#8A8478] shrink-0">
            {totalParticipants}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded-lg text-[#8A8478] hover:text-[#F3ECDD] hover:bg-[#1C1812] transition-colors cursor-pointer shrink-0"
          title="Collapse to pill"
          aria-label="Collapse to pill"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video Tiles: stacked vertically to match the left-rail dock orientation.
          Max-height is tied to the canvas tools dock's actual reserved footprint
          (its own height + bottom offset + a safety gap) so a crowded call's tile
          list can never grow into it, at any viewport height — a flat vh percentage
          doesn't hold that guarantee on shorter screens. */}
      <div className="flex flex-col gap-1.5 max-h-[calc(100vh-27rem)] overflow-y-auto">
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

      {/* Control Buttons Bar — icon-only to match the narrower rail dock */}
      <div className="flex items-center justify-between pt-1 border-t border-[#F3ECDD]/10 gap-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMic}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isMuted
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
                : "bg-[#1C1812] hover:bg-[#242019] text-[#F3ECDD] border border-[#F3ECDD]/10"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isCameraOn
                ? "bg-accent hover:bg-accent-hover text-white shadow-sm"
                : "bg-[#1C1812] hover:bg-[#242019] text-[#8A8478] border border-[#F3ECDD]/10"
            }`}
            title={isCameraOn ? "Turn camera off" : "Turn camera on"}
            aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 rounded-lg text-[#8A8478] hover:text-[#F3ECDD] hover:bg-[#1C1812] transition-colors cursor-pointer"
          title="Collapse to pill"
          aria-label="Collapse to pill"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
