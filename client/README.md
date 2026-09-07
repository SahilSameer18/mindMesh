# mindMesh — Frontend Client

The frontend client for **mindMesh**, an AI-native collaborative visual workspace that turns spoken dialogue into living, interactive knowledge maps in real time.

Built with **React 19**, **Vite 8**, **Tailwind CSS**, and a custom hardware-accelerated 2D canvas engine.

---

## 🏗️ Architecture & Component Hierarchy

```
client/src/
├── api/                  # Axios HTTP client & Socket.io client singleton
├── assets/               # Branding and static vector assets
├── components/
│   ├── activity/         # AI Activity drawer, EvidenceCards ("Why this exists")
│   ├── auth/             # Custom bcrypt/JWT login & signup modal
│   ├── canvas/           # InfiniteCanvas, CanvasNode (8 types), CanvasEdge, Minimap, Cursors
│   ├── command/          # ActiveCommandBar (Cmd+K / Ask your workspace)
│   ├── meeting/          # VideoConferenceBar, SpeechIntelligenceController, CommitCallModal
│   ├── presence/         # PresenterFollowBanner, peer avatar indicators
│   └── ui/               # WorkspaceHeader, SkeletonLoader, ModeSwitcher
├── context/
│   ├── AuthContext.jsx   # Current user session and authentication lifecycle
│   └── RoomContext.jsx   # Socket.io room lifecycle, connection status, peer roster
├── hooks/
│   ├── useAIActions.js   # Proposed AI actions, approval/rejection lifecycle
│   ├── useCanvas.js      # Optimistic 60fps pan/zoom, node moves, ack-based rollback
│   ├── usePresence.js    # Multiplayer cursor tracking and "Follow Me" broadcast
│   ├── useRoom.js        # Consumer hook for RoomContext
│   └── useSpeechRecognition.js # Unified Web Speech API dictation with interim captions
├── utils/
│   ├── canvasConstants.js# Action types, node color tokens, zoom limits
│   ├── colors.js         # HSL color mapping for participant avatars
│   └── layout.js         # Dagre-inspired hierarchical auto-layout engine
├── App.jsx               # Declarative workspace shell and keyboard shortcut listener
└── index.css             # Glassmorphism tokens, canvas grid, and shimmer animations
```

---

## ⚡ Core Frontend Invariants

1. **Custom 60fps Hardware-Accelerated Canvas**:
   - Uses CSS 2D matrix transformations (`transform: translate(x, y) scale(zoom)`) backed by GPU compositing.
   - Decoupled from heavy canvas libraries for instant reactivity and low bundle overhead.

2. **Client-Side UUIDs & Ack-Based Rollback**:
   - `useCanvas` generates cryptographic UUIDs (`crypto.randomUUID()`) prior to local insertion and socket emission.
   - If the server rejects an action, the client automatically rolls back to its pre-action snapshot without desynchronizing peers.

3. **Unified Single-Mic Pipeline**:
   - Exactly **one** instance of `useSpeechRecognition` is created in `App.jsx` and shared across the header dictation toggle (`M` hotkey) and the bottom video meeting dock.
   - Eliminates browser microphone resource collisions and guarantees seamless interim caption streaming.

4. **Canvas-Space Multiplayer Cursors**:
   - Cursors are broadcast strictly in canvas-space coordinates $(x, y)$, ensuring pointers lock to cards regardless of screen DPI, window size, or zoom level.
   - Throttled to 35ms with 60fps CSS transitions (`transform 40ms linear`) and a 5s idle fade-out.

5. **Skeleton Loaders (Rule 7)**:
   - All AI thinking states and card loaders use glassmorphic shimmer skeletons instead of raw spinning wheels.

---

## 🛠️ Development Scripts

```bash
# Start Vite development server (with HMR)
npm run dev

# Run ESLint validation
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend REST API server URL | `http://localhost:3000` |
| `VITE_SOCKET_URL` | WebSocket Socket.io server URL | `http://localhost:3000` |