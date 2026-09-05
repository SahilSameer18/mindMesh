# mindMesh — Master Implementation Plan (Streamlined 8 Phases)

---

# Phase 1: Foundation & Data Architecture
*Goal: Establish database models, seed demo identities, server foundation, and API contracts.*

- **1.1 Prisma Schema & Data Models (`server/prisma/schema.prisma`)**:
  - 11 models from Master Plan v4: `User`, `RoomMember`, `InviteLink`, `Workspace`, `Room`, `ContextZone`, `CanvasNode`, `CanvasEdge`, `TranscriptChunk`, `AIAction`, `RoomIntegration`, `MeetingReport`.
  - Compound indexes: `@@index([roomId])` and `@@index([roomId, semanticKey])`.
- **1.2 Single-Source-of-Truth Persistence with Neon PostgreSQL (`server/src/lib/prisma.js` & `server/src/canvas/canvasPersistence.js`)**:
  - Direct persistence into Neon PostgreSQL via Prisma WebSocket adapter (`@prisma/adapter-neon`).
  - Single source of truth: No parallel local JSON schemas or reconciliation overhead.
- **1.3 Unified API Response & Middleware (`server/src/utils/response.js` & `server/src/middlewares/error.middleware.js`)**:
  - `sendSuccess(res, message, data, code)` and `sendError(res, message, errors, code)` strictly obeying `{ success, message, data }` format.
  - Automatically sanitize responses by stripping internal identifiers (`__v`).
- **1.4 User Identity Abstraction & Database Seeding (`server/prisma/seed.js` & `auth.middleware.js`)**:
  - `getCurrentUser(req)` returning demo identity (*Elena Vance, Product Lead*).
  - Database seed script creating real PostgreSQL rows for `demo-user-1` (Elena), `demo-user-2` (Marcus), `default-workspace`, and `demo-room` to satisfy all foreign key relations (`RoomMember`, `CanvasNode`).
  - Standardize on `DEFAULT_ROOM_ID = "demo-room"` across backend `seed.js`, `canvasDocument.js`, and frontend `RoomContext.jsx` to prevent silent desync.
- **1.5 Server Bootstrap (`server/server.js` & `server/src/app.js`)**:
  - Express app + HTTP server + Socket.io server bootstrap with CORS, cookie-parser, and health check (`/api/health`).

---

# Phase 2: Real-time Canvas Engine & Collaboration Relay
*Goal: Build the interactive infinite canvas and WebSocket synchronization.*

- **2.1 `CanvasDocument` Single Source of Truth (`server/src/canvas/canvasDocument.js`)**:
  - In-memory authoritative state container managing nodes and edges for each active room.
  - Action validation for `CREATE_NODE`, `UPDATE_NODE`, `DELETE_NODE`, `CREATE_EDGE`, `DELETE_EDGE`, `MOVE_NODE`.
  - **Invariants & Edge Cases**:
    - *Persist-then-commit ordering*: Non-debounced actions persist to Postgres before mutating in-memory state to prevent silent memory drift on database write failure.
    - *Debounced `MOVE_NODE`*: Optimistic in-memory update with 100ms throttled database write queue; flushed immediately on teardown or conflicting actions.
    - *Dual cascade on `DELETE_NODE`*: In-memory map removes connected edges in `CanvasDocument`; database cascades via `prisma.canvasEdge.deleteMany` in `canvasPersistence.js`.
    - *Idempotent edge creation*: `CREATE_EDGE` uses `upsert()` to prevent duplicate key errors on client retry/dropped-ACK.
    - *Update field whitelist*: `updateNodeAction()` enforces strict whitelist (`text`, `type`, `semanticKey`, `x`, `y`, `metadata`) to block `id` or `roomId` mutations.
- **2.2 Socket.io Collaboration Relay (`server/src/realtime/socket.js` & `canvas.socket.js`)**:
  - Client emits `canvas:action` → Server validates → Updates `CanvasDocument` → Persists to Prisma → Broadcasts to all peers in the room.
  - **Invariants & Edge Cases**:
    - *Room authorization enforcement*: Handlers strictly use authoritative `socket.roomId` set during `canvas:join`, ignoring client-supplied room IDs to prevent cross-room write bypass.
    - *Consolidated `canvas:join`*: Single event handles room joining, emits `canvas:init` with full state to caller, and broadcasts `presence:peer-joined` to room peers (no separate redundant `room:join`).
    - *Dynamic room verification (Phase 5)*: In Phase 2, `demo-room` existence is guaranteed by `seed.js`. When custom rooms and invite links arrive in Phase 5, `canvas:join` must verify room existence via `getOrCreateRoom` upfront so non-existent room IDs fail with a clean error rather than throwing a foreign-key constraint violation on node/edge creation.
- **2.3 Frontend Canvas Engine (`client/src/components/canvas/InfiniteCanvas.jsx` & `useCanvas.js`)**:
  - Infinite hardware-accelerated 2D canvas with smooth pan, zoom (wheel/touch), and coordinate transformation math.
  - Optimistic local updates for snappy 60fps interaction.
- **2.4 Rich Visual Node Components (`client/src/components/canvas/CanvasNode.jsx` & `CanvasEdge.jsx`)**:
  - Render 8 specialized node types: 🎯 Goal, 💡 Idea, 🟢 Task (assignee + checkbox), 🔵 Decision, 🟣 Question, 🔴 Risk, 👤 Person, 🖼️ Generated Visual.
  - Render smooth Bezier curve connection lines with relationship tags (`blocks`, `depends_on`, `leads_to`, `supports`, `part_of`).
  - *Connecting click gating*: Node clicks must only trigger connection completion when an active connection drag (`connectingNodeId`) is in progress, preventing redundant no-op calls during regular card clicks.

---

# Phase 3: AI Intelligence Engine & Confidence Routing (Complete & Verified)
*Goal: Build the multi-provider LLM abstraction, confidence routing, and in-place correction.*

- **3.1 Dual-Provider LLM Abstraction (`server/src/ai/providers/`)**:
  - `groq.js`: Primary provider (Llama 3.3 70B — free, ultra-fast ~300 t/s, structured JSON).
    - Rate Limits: 30 RPM, 12,000 TPM, 1,000 RPD (~2.75 hours of meetings/day).
  - `gemini.js`: Secondary fallback (Gemini 2.0 / 1.5 Flash — free, high reliability, 1M TPM).
    - Rate Limits: 15 RPM, 1,000,000 TPM, 1,500 RPD (~4.15 hours of meetings/day).
  - `index.js`: Clean fallback wrapper (`withFallback`).
    - Seamless HTTP 429 failover: If Groq hits rate limits or server spikes, automatically routes to Gemini Flash with zero interruption.
    - If both fail, return `{ actions: [], status: "failed" }` with an unobtrusive "AI unavailable, try again" state (no complex hand-rolled NLP engine).
  - **Context Priming (Phonetic Auto-Correction)**:
    - Injects room participant roster and active canvas entity keys into system prompt so the LLM automatically deduces and corrects phonetic STT mishears (e.g. *"off flow"* $\to$ *"auth flow"*, *"prism a"* $\to$ *"Prisma"*).
- **3.2 Confidence Routing Engine (`server/src/ai/validation.js`)**:
  - Implement `routeAction(action)`:
    - `confidence >= 0.85` → `"auto"` (applied directly to canvas).
    - `0.5 <= confidence < 0.85` → `"proposed"` (surfaced in AI Activity stream).
    - `confidence < 0.5` → `"clarify"` (Echo prompts for clarification).
    - Destructive actions (`DELETE_NODE`, `DELETE_EDGE`) are **never** auto-applied.
- **3.3 In-Place Correction via `semanticKey` (`server/src/canvas/canvasDeduplication.js`)**:
  - Match entities against active canvas nodes by stable `semanticKey`.
  - In-place update test: When user says *"Actually, Mike is busy, Sam will take the dashboard"*, update the existing Task node's assignee in place rather than creating a duplicate.
- **3.4 Invariants & Edge Cases**:
  - *Deterministic UUID Assignment*: `validateAIAction()` assigns `crypto.randomUUID()` to all `CREATE_NODE` and `CREATE_EDGE` payloads upfront. Prevents validation rejection by `validateCanvasAction()` in `CanvasDocument` and ensures in-batch edge references resolve to true UUIDs instead of slugs.
  - *Token Headroom Guard (`max_tokens: 2500`)*: Raised from 1000 to prevent LLM response truncation on multi-entity extraction batches, eliminating silent `SyntaxError` throws on `JSON.parse()`.
  - *SyntaxError Transparent Failover*: `shouldFallback()` in `withFallback` catches truncated JSON / `SyntaxError` alongside HTTP 429/500, ensuring malformed LLM outputs fail over to Gemini Flash seamlessly rather than erroring out.
  - *Candidate Model Resilience*: `groq.js` loops through candidate models (`config.groqModel`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`) on HTTP 404, gracefully surviving per-organization model deprecations.
  - *Comprehensive Metadata Mutation Detection*: `deduplicateAndLinkActions()` checks all keys in `metadata` (not just `assignee` and `text`), ensuring task status changes (`"mark as done"`) and priority shifts generate in-place `UPDATE_NODE` actions.
  - *Multi-Key Round-Robin Pooling*: `GROQ_API_KEYS=key1,key2` automatically rotates between pooled keys, doubling the free tier ceiling to 2,000 requests/day.

---

# Phase 4: The Active Command Bar & AI Activity Stream (Complete & Verified)
*Goal: Build the headline conversational control bar, shared effector bridge, and "Why this exists" evidence system.*

- **4.0 AI Action Effector & Activity Stream Persistence Bridge (`server/src/ai/applyAIActions.js` & `server/src/utils/hash.js`)**:
  - Deterministic SHA-256 fingerprinting with normalized sorted JSON payloads (`hash(roomId + sourceId + type + normalizedPayload)`) to enforce the `@unique` constraint on `AIAction.fingerprint`.
  - Authoritative status routing:
    - `"auto"` actions: written to `CanvasDocument.applyAction()`, broadcasted via `canvas:action` and `ai:activity` over Socket.io, and updated in DB to `status: "applied"`.
    - `"proposed"` & `"clarify"` actions: persisted to Neon Postgres with `status: "proposed"` and emitted via `ai:proposed` to surface user approval badges in the UI.
  - Resolution lifecycle: `approveAIAction()` and `rejectAIAction()` with HTTP (`/api/rooms/:roomId/ai-actions`) and Socket.io handlers for interactive review.
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

# Phase 5: Stepped Transcript Simulator, Passive Extraction & Auth
*Goal: Deterministic meeting simulator, continuous conversation-to-canvas extraction, and session auth.*

- **5.1 Stepped Transcript Playback Simulator (`client/src/components/meeting/SpeechIntelligenceController.jsx`)**:
  - Pre-loaded transcript scenarios (including Founder Studio Brainstorm and Onboarding/Analytics Sprint).
  - One-click stepped or continuous playback feeding `ingestTranscriptChunk()` — provides a rock-solid, ambient-noise-free testing and rehearsal environment.
- **5.2 Passive Streaming Extraction (`server/src/ai/extraction.js` & `ai.service.js`)**:
  - **Speaker Attribution Pipeline**:
    - Each client emits attributed speech chunks `{ speaker, userId, text, timestamp }` from its isolated microphone.
    - Server formats context as a structured dialogue script: `[10:14:02] Elena Vance: "..." \n [10:14:05] Marcus Sterling: "..."`.
    - Enables accurate entity and task attribution (e.g., resolving "I will take..." to the active speaker).
  - **Adaptive Triggering with Single-Flight Coalescing (Replacing Blind 10s Timer)**:
    - *Trigger Conditions*: Speaker turn switch (Elena $\to$ Marcus), 1.5s natural pause, or 8–10s ceiling monologue window.
    - *Single-Flight Lock & Cooldown (3.5s)*: Enforces that only one LLM extraction can be in-flight at any time. If a speaker switch or pause fires while a request is in-flight or within the 3.5s cooldown window, incoming dialogue chunks are buffered into an accumulator queue. When the lock/cooldown clears, all accumulated dialogue flushes in one single batch.
    - *Rate Limit Ceiling Enforcement*: Hard-caps call frequency to $\le 17\text{ RPM}$, guaranteeing full compliance with Groq's 30 RPM and Gemini's 15 RPM free quotas, while eliminating out-of-order response race conditions.
  - **Conversational Filler Filter**:
    - Discards chunks under 4 words of conversational fluff (*"yeah"*, *"uh-huh"*, *"okay"*), saving 30–40% of API call budget.
  - Mode-aware ontology prompt extracting multi-node graphs and dependency edges.
- **5.3 Canonical Test Paragraph Verification**:
  - Verify against:
    > *"We need to improve onboarding. Mike will redesign the dashboard, but analytics needs to be ready first."*
  - Verifies Goal node, Task node (Mike), Analytics node, and `blocks` edge with evidence attached.
- **5.4 Real Custom Authentication (`server/src/routes/auth.routes.js` & `client/src/context/AuthContext.jsx`)**:
  - Password hashing with bcrypt (10 salt rounds).
  - JWT stored in httpOnly, secure, sameSite=lax cookie.
  - Endpoints: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
  - Protect Socket.io handshake (`io.use`) to ensure cursors display verified user identities.
  - Update `getOrCreateRoom({ roomId, userId })` to automatically insert a `RoomMember` record with `role: "owner"` for the room creator upon initial room creation.
  - Wire `canvas:join` to verify room existence / call `getOrCreateRoom` upfront so dynamic/invite room IDs are checked before loading canvas state, preventing foreign-key violations.

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
  - **Core Deliverables (Full Thesis Validation)**:
    - **Operational Mode**: Pre-loaded topic outline; nodes pop underneath topic columns; unresolved questions tracked.
    - **Brainstorm Mode**: Organic mindmap clustering; triggers visual concept generation.
    - Pre-meeting context prompt via `Room.systemContext`.
  - **Secondary / Polish Extensions**:
    - **Solo Mode**: Single-user thinking landscape without participant attribution.
    - Runtime behavioral steering override: `ai.setSessionBehavior(roomId, instruction)` (treated as an optional stretch to avoid density bottleneck).
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

- **8.1 Dual-Tier Speech-to-Text Audio Engine (`client/src/hooks/useSpeechRecognition.js` & `server/src/ai/transcription.js`)**:
  - **Zero-Latency Local Captions**: Web Speech API directly from user's microphone for real-time live captions.
  - **High-Accuracy Cloud Transcription (Groq Whisper Large v3 Turbo)**:
    - Model: `whisper-large-v3-turbo` hosted on Groq LPUs.
    - Quota: 7,200 audio seconds per hour (2 hours of audio processed per hour for $0.00).
    - Accurately captures heavy accents, technical engineering jargon, and noisy room environments.
- **8.2 Video Conference Bar (`client/src/components/meeting/VideoConferenceBar.jsx`)**:
  - Dockable bottom bar with webcam tiles, mic/camera/screenshare toggles, and live captions.
- **8.3 Dagre Hierarchical Auto-Layout Engine (`client/src/utils/layout.js`)**:
  - Automated layout algorithm arranging nodes into clean hierarchical trees.
- **8.4 Skeleton Loaders, Mobile Responsiveness & Polish**:
  - Dark-mode glassmorphic aesthetics.
  - Skeleton loaders for all AI thinking states (strictly adhering to user rules).
  - Mobile-first responsive viewports with collapsable tool drawers.
- **8.5 End-to-End Demo Script Dry Run**:
  - Validate the 13-point master demo script (*"We don't take notes for you. We think with you."*).


