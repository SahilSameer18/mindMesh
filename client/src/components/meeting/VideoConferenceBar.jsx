import { useEffect, useRef } from "react";
import { useWebRTC } from "../../hooks/useWebRTC.js";
import { useRoom } from "../../hooks/useRoom.js";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

/**
 * Functional P2P Video Conference Bar.
 * Renders local & remote WebRTC video tiles with zero-CPU track status indicators
 * and ambient avatar fallbacks.
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

function VideoTile({ stream, name, isMuted, isCameraOn, isLocal, color }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = isCameraOn && stream;
  const displayName = isLocal ? "You" : name || "Collaborator";

  return (
    <div className="relative w-36 h-24 rounded-xl overflow-hidden bg-slate-900 border border-border-subtle/80 flex items-center justify-center shadow-subtle shrink-0 select-none">
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
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-subtle border border-white/20"
            style={{ backgroundColor: color || (isLocal ? "#0284c7" : "#059669") }}
          >
            {getInitials(name)}
          </div>
        </div>
      )}

      {/* Name and Mute Status Overlay */}
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-1.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] text-white">
        <span className="truncate max-w-[85px] font-medium">
          {displayName}
        </span>
        {isMuted ? (
          <span className="flex items-center gap-0.5 text-rose-400 font-semibold shrink-0">
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
    currentUserId: currentUser?.id,
  });

  useEffect(() => {
    // Automatically initialize audio/video on mount
    startLocalMedia({ video: true, audio: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!socket) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-surface/90 dark:bg-zinc-900/90 backdrop-blur-md border border-border-subtle rounded-2xl p-2.5 flex items-center gap-2.5 shadow-elevated transition-all">
      {/* Local User Tile */}
      <VideoTile
        stream={localStream}
        name={currentUser?.name}
        isMuted={isMuted}
        isCameraOn={isCameraOn}
        isLocal
        color={currentUser?.color}
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
          />
        );
      })}

      {/* Control Buttons */}
      <div className="flex flex-col gap-1.5 ml-1">
        <button
          type="button"
          onClick={toggleMic}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isMuted
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-surface-subtle hover:bg-surface-hover text-text-main border border-border-subtle"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={toggleCamera}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isCameraOn
              ? "bg-sky-600 hover:bg-sky-500 text-white"
              : "bg-surface-subtle hover:bg-surface-hover text-text-muted border border-border-subtle"
          }`}
          title={isCameraOn ? "Turn camera off" : "Turn camera on"}
          aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
        >
          {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
