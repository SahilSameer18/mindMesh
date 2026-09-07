# Future Feature Architecture: Full WebRTC Peer-to-Peer Video Calling (Like Google Meet)

## Executive Summary & Vision

This document details the complete, production-grade architectural specification for adding **Full Peer-to-Peer WebRTC Video Calling** to mindMesh as an independent, modular future feature.

When implemented, it elevates mindMesh into a unified **Google Meet + Miro + Cursor-for-Meetings** experience:
- Collaborators in the room see and hear each other live with $<150$ms ultra-low latency.
- Real camera streams render inside floating glassmorphic video tiles at the bottom of the canvas.
- Real-time audio visualizer rings pulse around active speakers.
- Everything operates with **zero media server infrastructure cost**, leveraging our existing Socket.io instance for WebRTC signaling and public Google STUN servers for NAT traversal.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 WebRTC P2P Video Calling Architecture                                  │
│                                                                                                        │
│     ┌────────────────────────────────────────────────────────────────────────────────────┐             │
│     │                       Authoritative Socket.io Signaling Hub                        │             │
│     │   • webrtc:offer  • webrtc:answer  • webrtc:ice-candidate  • presence:media-state  │             │
│     └─────────────────────────────────┬──────────────────────────────────────────────────┘             │
│                                       │                                                                │
│                   ┌───────────────────┴───────────────────┐                                            │
│                   ▼                                       ▼                                            │
│   ┌───────────────────────────────┐       ┌───────────────────────────────┐                            │
│   │ Peer 1: Elena (Product Lead)  │◄─────►│ Peer 2: Marcus (Tech Lead)    │                            │
│   │ • Local webcam (getUserMedia) │  P2P  │ • Local webcam (getUserMedia) │                            │
│   │ • Audio Analyser (RMS meter)  │ Audio │ • Audio Analyser (RMS meter)  │                            │
│   │ • RTCPeerConnection Pool      │ Video │ • RTCPeerConnection Pool      │                            │
│   │ • Ambient Avatar Fallback     │ Track │ • Ambient Avatar Fallback     │                            │
│   └───────────────────────────────┘       └───────────────────────────────┘                            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Core Technical Invariants & Architectural Decisions

### Invariant 1: Mesh Topology over SFU (Zero-Infrastructure Philosophy)
* **Design Decision**: Use a **Full Mesh Topology** (peer-to-peer directly between browsers) rather than a Selective Forwarding Unit (SFU like Mediasoup or LiveKit).
* **Rationale**:
  - mindMesh meeting rooms are designed for focused squads (2 to 4 collaborators: Elena, Marcus, tech leads, designers).
  - In a 2–4 peer room, an uplink of 3 connections ($3 \times 300\text{ kbps} \approx 900\text{ kbps}$) runs effortlessly on standard broadband.
  - Mesh requires **zero server deployment costs, zero external cloud media subscriptions, and zero additional Docker containers**.

### Invariant 2: Consolidated Disconnect Cleanup (Zero Ghost Tiles)
* **The Trap**: If a peer abruptly closes their browser tab, their camera stream, audio track, and speaking indicators could remain frozen as "ghost" tiles in other participants' views.
* **The Solution**: Extend Phase 6's consolidated `handleSocketDisconnect` in `server/src/realtime/presence.socket.js`:
  ```js
  // When socket disconnects:
  io.to(roomId).emit("webrtc:peer-left", { socketId: socket.id });
  io.to(roomId).emit("presence:peer-media-updated", { 
    socketId: socket.id, 
    mediaState: { isMuted: true, isCameraOn: false, isSpeaking: false } 
  });
  ```
  On the client, the `webrtc:peer-left` event immediately invokes `peerConnection.close()`, releases the `remoteStream`, and cleanly unmounts the peer's video element.

### Invariant 3: Graceful Ambient Avatar Fallback
* **Requirement**: The video call must look stunning even if a user has no webcam, camera permission is denied, or the user intentionally turns their camera off.
* **Behavior**:
  - When `isCameraOn === true`: Renders a live `<video autoPlay playsInline />` element with a subtle glassmorphic border.
  - When `isCameraOn === false`: Smoothly cross-fades into an ambient animated gradient avatar displaying the participant's initials, name badge, and role pill (`Product Lead`, `Tech Lead`).
  - The speaking visualizer ring functions identically in both modes!

### Invariant 4: Input-Safe Hotkeys
* Pressing `M` (mute mic) or `V` (toggle camera) strictly guards against active text inputs:
  ```js
  if (e.target.matches("input, textarea, [contenteditable]")) return;
  ```
  This guarantees that typing *"Move the card"* never accidentally mutes the microphone.

---

## 2. Signaling Protocol Specification (Socket.io)

All WebRTC signaling messages are relayed between peers within the same `roomId`. The server acts purely as a routing pipe without decoding media bytes.

### Event Schema

| Event Name | Direction | Payload | Description |
| :--- | :---: | :--- | :--- |
| `webrtc:offer` | Client $\to$ Server $\to$ Client | `{ targetSocketId, senderSocketId, offer: RTCSessionDescriptionInit }` | Initiates P2P connection with SDP offer |
| `webrtc:answer` | Client $\to$ Server $\to$ Client | `{ targetSocketId, senderSocketId, answer: RTCSessionDescriptionInit }` | Responds to SDP offer with SDP answer |
| `webrtc:ice-candidate` | Client $\to$ Server $\to$ Client | `{ targetSocketId, senderSocketId, candidate: RTCIceCandidateInit }` | Exchanges network routing candidate |
| `presence:media-state` | Client $\to$ Server $\to$ Room | `{ roomId, isMuted: boolean, isCameraOn: boolean, isSpeaking: boolean }` | Broadcasts user media toggles |
| `webrtc:peer-left` | Server $\to$ Room | `{ socketId: string }` | Notifies peers to close connection on disconnect |

### STUN Configuration (Free Public Google Relays)
```javascript
export const RTC_CONFIGURATION = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};
```

---

## 3. Client Architecture (`client/src/hooks/useWebRTC.js`)

### State & Ref Inventory
```javascript
export function useWebRTC({ socket, roomId, currentUser }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // socketId -> MediaStream
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState(new Set()); // socketId set

  const peerConnections = useRef(new Map()); // socketId -> RTCPeerConnection
  const audioAnalysers = useRef(new Map());  // socketId/local -> AnalyserNode
  const animFrameRef = useRef(null);
  // ...
}
```

### Key Functional Workflows

#### 1. Local Media Initialization (`startCamera` / `startMic`)
```javascript
const startLocalMedia = async ({ video = true, audio = true } = {}) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 30 } } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
    setLocalStream(stream);
    setIsCameraOn(video);
    setIsMuted(!audio);
    return stream;
  } catch (err) {
    console.warn("[WebRTC] Camera access denied or unavailable:", err.message);
    // Graceful fallback to audio-only or avatar
    return null;
  }
};
```

#### 2. P2P Mesh Negotiation Lifecycle
1. **Peer Joins (`presence:peer-joined`)**:
   - The joining peer or existing peer instantiates an `RTCPeerConnection(RTC_CONFIGURATION)`.
   - Local tracks are attached:
     ```javascript
     localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
     ```
   - Candidates are emitted to peer:
     ```javascript
     pc.onicecandidate = (e) => {
       if (e.candidate) {
         socket.emit("webrtc:ice-candidate", { targetSocketId, candidate: e.candidate });
       }
     };
     ```
   - Incoming tracks populate `remoteStreams`:
     ```javascript
     pc.ontrack = (e) => {
       setRemoteStreams((prev) => new Map(prev).set(targetSocketId, e.streams[0]));
     };
     ```
   - Initiator creates offer $\to$ `pc.setLocalDescription(offer)` $\to$ emits `webrtc:offer`.
2. **Offer Received (`webrtc:offer`)**:
   - Peer creates connection, sets remote description, adds local tracks, creates answer, and emits `webrtc:answer`.
3. **Answer Received (`webrtc:answer`)**:
   - Initiator sets remote description. The P2P stream is live!

#### 3. Real-Time Audio RMS Speaking Meter
```javascript
// Web Audio API volume monitoring at 30Hz
const setupAudioMeter = (stream, identifier) => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const checkVolume = () => {
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    const isSpeaking = average > 18; // RMS threshold

    // Update speaking state and emit to room if local
    animFrameRef.current = requestAnimationFrame(checkVolume);
  };
  checkVolume();
};
```

#### 4. Screen Sharing (`getDisplayMedia`)
```javascript
const toggleScreenShare = async () => {
  if (!isScreenSharing) {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    
    // Replace track on all active peer connections
    for (const pc of peerConnections.current.values()) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    }
    
    screenTrack.onended = () => stopScreenShare();
    setIsScreenSharing(true);
  } else {
    stopScreenShare();
  }
};
```

---

## 4. UI Component Specification (`VideoConferenceBar.jsx`)

### Spatial & Glassmorphic Design
* **Dock Coordinates**: Fixed at `bottom-6 left-1/2 -translate-x-1/2 z-40`.
* **Container Styling**: `bg-slate-950/85 backdrop-blur-2xl border border-slate-700/80 shadow-2xl rounded-2xl p-2 sm:p-3 flex items-center gap-3`.
* **Two Viewport Modes**:
  1. **Expanded Mode (`h-32`)**: Full participant gallery showing active video feeds and avatars.
  2. **Collapsed Pill Mode (`h-12`)**: Minimalist floating control strip showing status icons and quick action buttons.

### Video Card Details
* **Tile Dimensions**: `w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden relative border border-slate-800 bg-slate-900`.
* **Active Speaker Aura**:
  ```css
  .is-speaking {
    ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950
    shadow-[0_0_25px_rgba(52,211,153,0.5)]
    transition: all 0.2s ease-out;
  }
  ```
* **Bottom Overlay**:
  - Name pill: `@Elena Vance (Product Lead)`
  - Mute status indicator: Red micro-icon when muted.

### Call Control Bar Buttons
1. **Mic Toggle (`M`)**: Emerald when live / Rose with line-through when muted.
2. **Camera Toggle (`V`)**: Sky blue when active / Slate when disabled.
3. **Screen Share**: Violet accent with active broadcasting indicator.
4. **Hierarchical Tidy**: One-click trigger for Dagre layout.
5. **Collapse / Expand Dock**: Minimizes bar to preserve canvas visibility.

---

## 5. Phased Implementation Roadmap (For Future Build)

When ready to implement this feature, follow these 4 structured steps:

1. **Step 1: Socket.io WebRTC Signaling (Server)**:
   - Add `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate` relay listeners in `server/src/realtime/presence.socket.js`.
   - Add `webrtc:peer-left` cleanup to `handleSocketDisconnect`.
2. **Step 2: Client WebRTC Hook (`useWebRTC.js`)**:
   - Build connection pool, STUN server negotiation, local camera/mic stream initialization, and audio RMS visualizer.
3. **Step 3: Floating Video Conference Bar UI (`VideoConferenceBar.jsx`)**:
   - Build dockable container, video tags with `srcObject` binding, animated avatar fallbacks, speaking rings, and hotkey listeners.
4. **Step 4: End-to-End Multi-Tab Testing**:
   - Open Elena in Tab 1 and Marcus in Tab 2.
   - Verify camera feeds stream peer-to-peer, speaking rings pulse on audio, and closing Tab 2 cleanly removes the tile in Tab 1 with zero ghosting.