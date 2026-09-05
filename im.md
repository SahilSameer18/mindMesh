Here is the complete, granular implementation plan structured into **8 distinct phases**:

---

# Phase 1: Foundation & Data Architecture
*Goal: Establish the database models, server foundation, user abstraction, and API contracts.*

- **1.1 Prisma Schema & Data Models (`server/prisma/schema.prisma`)**:
  - Implement the 11 Master Plan v4 models: `User`, `RoomMember`, `InviteLink`, `Workspace`, `Room`, `ContextZone`, `CanvasNode`, `CanvasEdge`, `TranscriptChunk`, `AIAction`, `RoomIntegration`, `MeetingReport`.
  - Add compound indexes: `@@index([roomId])` and `@@index([roomId, semanticKey])`.
- **1.2 Dual Persistence Resilience Layer (`server/src/lib/prisma.js` & `server/src/services/room.service.js`)**:
  - Primary: Neon Postgres via Prisma Client.
  - Resilient Fallback: Local JSON snapshot store (`server/data/rooms.json`) so the app never crashes if a remote database URL is unconfigured or unreachable.
- **1.3 Unified API Response & Middleware (`server/src/utils/response.js` & `server/src/middlewares/error.middleware.js`)**:
  - Implement `sendSuccess(res, message, data, code)` and `sendError(res, message, errors, code)` strictly obeying the `{ success, message, data }` format.
  - Sanitize data by stripping internal IDs (`__v`, internal metadata).
  - Global error and 404 handlers.
- **1.4 User Identity Abstraction (`server/src/middlewares/auth.middleware.js`)**:
  - Create `getCurrentUser(req)` returning a seeded demo identity (*Elena Vance, Product Lead*) for zero-friction early development, architected for instant swap to real JWT auth in Phase 5.
- **1.5 Server Bootstrap (`server/server.js` & `server/src/app.js`)**:
  - Express app + HTTP server + Socket.io server bootstrap with CORS and health-check route.

---

# Phase 2: Real-time Canvas Engine & Collaboration Relay
*Goal: Build the interactive infinite canvas and WebSocket synchronization.*

- **2.1 `CanvasDocument` Single Source of Truth (`server/src/canvas/canvasDocument.js`)**:
  - In-memory authoritative state container managing nodes and edges for each active room.
  - Action validators for `CREATE_NODE`, `UPDATE_NODE`, `DELETE_NODE`, `CREATE_EDGE`, `DELETE_EDGE`, `MOVE_NODE`.
- **2.2 Socket.io Collaboration Relay (`server/src/realtime/socket.js` & `canvas.socket.js`)**:
  - Client emits `canvas:action` → Server validates → Updates `CanvasDocument` → Persists → Broadcasts to all peers in the room.
  - Throttled debounce on `MOVE_NODE` (50–100ms during dragging; final commit on drag end).
- **2.3 Frontend Canvas Engine (`client/src/components/canvas/InfiniteCanvas.jsx` & `useCanvas.js`)**:
  - Infinite hardware-accelerated 2D canvas with smooth pan, zoom (wheel/touch), and canvas coordinates transformation.
  - Local optimistic state updates for instantaneous responsiveness.
- **2.4 Rich Visual Node Components (`client/src/components/canvas/CanvasNode.jsx` & `CanvasEdge.jsx`)**:
  - Render 8 specialized node types: 🎯 Goal, 💡 Idea, 🟢 Task (assignee + checkbox), 🔵 Decision, 🟣 Question, 🔴 Risk, 👤 Person, 🖼️ Generated Visual.
  - Render smooth Bezier curve connection lines with relationship tags (`blocks`, `depends_on`, `leads_to`, `supports`, `part_of`).

---

# Phase 3: AI Intelligence Engine & Confidence Routing
*Goal: Build the AI provider layer, action routing, and in-place correction logic.*

- **3.1 Multi-Provider AI Abstraction (`server/src/ai/providers/`)**:
  - `groq.js`: Primary provider (Llama 3.3 70B — ultra-fast, structured JSON).
  - `gemini.js`: Secondary fallback (Gemini Flash).
  - `index.js`: Resilient wrapper catching 429/500/timeout + Tertiary Built-in Semantic NLP Engine (guaranteeing 100% uptime with zero keys).
- **3.2 Confidence Routing Engine (`server/src/ai/validation.js`)**:
  - Implement `routeAction(action)`:
    - `confidence >= 0.85` → `"auto"` (applied directly to canvas).
    - `0.5 <= confidence < 0.85` → `"proposed"` (surfaced in AI Activity stream).
    - `confidence < 0.5` → `"clarify"` (Echo prompts for clarification).
    - Destructive actions (`DELETE_NODE`, `DELETE_EDGE`) are **never** auto-applied.
- **3.3 In-Place Correction via `semanticKey` (`server/src/canvas/canvasDeduplication.js`)**:
  - Match entities against active canvas nodes by stable `semanticKey`.
  - Test live correction: When a user says *"Actually, Mike is busy, Sam will take the dashboard"*, it updates the existing Task node's assignee in place rather than creating a duplicate!

---

# Phase 4: The Active Command Bar & AI Activity Stream
*Goal: Build the headline conversational control bar and "Why this exists" evidence system.*

- **4.1 Active Command Bar UI (`client/src/components/command/ActiveCommandBar.jsx`)**:
  - Permanent floating input at canvas bottom: `✨ Ask your workspace...`
  - Rotating prompt pills (*"Turn this into a roadmap"*, *"What did we decide?"*, *"Show all dependencies"*, *"Move risks to the right"*).
- **4.2 Action Vocabulary Expansion (`server/src/ai/commands.js`)**:
  - Implement `REORGANIZE_LAYOUT`: Re-aligns existing nodes (hierarchical roadmap, cluster by theme, move risks to right) through the layout engine.
  - Implement `ANSWER_QUERY`: Read-only semantic query returning highlighted node/edge IDs and a synthesized recap.
- **4.3 AI Activity Stream (`client/src/components/activity/ActivityStream.jsx`)**:
  - Live activity feed showing chronological AI actions with timestamps, confidence badges, and status.
- **4.4 "Why This Exists" Evidence Card (`client/src/components/activity/EvidenceCard.jsx`)**:
  - Clicking any node opens an inspection card displaying: Exact transcript quote, speaker name, timestamp, and AI reasoning.

---

# Phase 5: Passive Extraction & Authentication
*Goal: Extract nodes from continuous conversation and implement secure session auth.*

- **5.1 Passive Streaming Extraction (`server/src/ai/extraction.js` & `ai.service.js`)**:
  - Ingestion buffer chunking incoming speech into cohesive thoughts.
  - Ontology prompt extracting multi-node graphs and dependency edges.
- **5.2 Canonical Test Paragraph Verification**:
  - Execute test against:
    > *"We need to improve onboarding. Mike will redesign the dashboard, but analytics needs to be ready first."*
  - Verify automatic creation of Goal node, Task node (Mike), Analytics node, and `blocks` edge with evidence attached.
- **5.3 Real Custom Authentication (`server/src/routes/auth.routes.js` & `client/src/context/AuthContext.jsx`)**:
  - Password hashing with bcrypt (10 salt rounds).
  - JWT stored in httpOnly, secure, sameSite=lax cookie.
  - Endpoints: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
  - Protect Socket.io handshake (`io.use`) to ensure cursors display verified user identities.

---

# Phase 6: Presence, Minimap & Meeting Modes
*Goal: Implement multiplayer live presence and adaptive meeting formats.*

- **6.1 Multiplayer Live Cursors (`client/src/components/canvas/MultiplayerCursors.jsx`)**:
  - Throttled cursor position emission with smooth lerp movement and user color tags.
- **6.2 Radar Minimap with Viewports (`client/src/components/canvas/Minimap.jsx`)**:
  - Fixed bottom-right radar thumbnail of canvas.
  - Renders current user camera rectangle, peer viewports in their assigned colors, and cursor dots.
  - Click-and-drag navigation on minimap to jump/pan the main camera.
- **6.3 "Follow Me" Presenter Broadcast (`server/src/realtime/presence.socket.js`)**:
  - Presenter activates "Follow Me" → broadcasts camera coordinates `(x, y, zoom)` → followers' screens smoothly track the leader.
  - Followers see an unobtrusive banner: *"Following Elena Vance — [Stop Following]"*.
- **6.4 Adaptive Meeting Modes & Steerability (`Room.mode`)**:
  - **Operational Mode**: Pre-loaded topic outline; nodes pop underneath topic columns; unresolved questions tracked.
  - **Brainstorm Mode**: Organic mindmap clustering; triggers visual generation.
  - **Solo Mode**: Single-user thinking landscape without participant attribution.
  - Steerable runtime override: `ai.setSessionBehavior(roomId, instruction)` (*"Stop making boxes, give me visuals"*).
  - Pre-meeting context prompt via `Room.systemContext`.
- **6.5 Contextual Zones (`ContextZone`)**:
  - Save and jump to named regions (*"Roadmap Area"*, *"Risks Matrix"*).

---

# Phase 7: Generative Visuals, Commit Flow & External Integrations
*Goal: Connect canvas brainstorms to Pollinations.ai and package meetings for Notion, Slack, and Resend.*

- **7.1 Pollinations.ai Generative Visuals (`server/src/integrations/imageGen.js`)**:
  - Free, zero-key image caller via `https://image.pollinations.ai/prompt/{encodedPrompt}`.
  - In Brainstorm mode, AI automatically triggers visual concept generation and attaches image URLs to nodes.
- **7.2 Meeting Commit Flow (`server/src/services/ai.service.js` & `CommitCallModal.jsx`)**:
  - Dedicated "Commit Call" button triggering `ai.summarizeMeeting()`.
  - Synthesizes Executive Summary, Decisions Log, Action Items Table, and Unanswered Questions into `MeetingReport`.
  - Celebratory confetti visual effect.
- **7.3 External Integrations (`server/src/integrations/`)**:
  - `slack.js`: Formatted Slack Block Kit message posted to Incoming Webhook.
  - `notion.js`: Creates structured meeting page in Notion database via Notion API.
  - `email.js`: Dispatches transactional HTML report via Resend API (+ in-app markdown/PDF download).
  - Verifies room state is fully persistent and can be reopened a month later intact.

---

# Phase 8: Voice, Video Meeting Suite & Final Polish
*Goal: Integrate voice dictation, video communication bar, auto-layout, and demo script validation.*

- **8.1 Web Speech API Microphone Dictation (`client/src/hooks/useSpeechRecognition.js`)**:
  - Real-time speech-to-text directly from user's microphone with live audio level visualization.
- **8.2 Multi-Party Meeting Dialogue Simulators (`client/src/components/meeting/SpeechIntelligenceController.jsx`)**:
  - Pre-loaded transcript scenarios (including the Founder Studio Brainstorm from the prompt) with one-click stepped playback.
- **8.3 Video Conference Bar (`client/src/components/meeting/VideoConferenceBar.jsx`)**:
  - Dockable bottom bar with webcam tiles, mic/camera/screenshare toggles, and live captions.
- **8.4 Dagre Hierarchical Auto-Layout Engine (`client/src/utils/layout.js`)**:
  - Automated layout algorithm arranging nodes into clean hierarchical trees.
- **8.5 Skeleton Loaders, Mobile Responsiveness & Polish**:
  - Dark-mode glassmorphic aesthetics.
  - Skeleton loaders for all AI thinking states (strictly adhering to user rules).
  - Mobile-first responsive viewports with collapsable tool drawers.
- **8.6 End-to-End Demo Script Dry Run**:
  - Validate the 13-point master demo script (*"We don't take notes for you. We think with you."*).

---
