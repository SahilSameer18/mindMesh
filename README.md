# mindMesh

> **The conversation becomes the canvas.**
> An AI-powered collaborative visual workspace where teams meet, think, and build together on a shared infinite canvas.

---

## Overview

**mindMesh** transforms real-time team dialogue into an interactive, interconnected knowledge graph. As participants speak or type, the system's dual-provider AI engine extracts goals, ideas, tasks, decisions, questions, and risks, calculating relational dependencies and laying them out geometrically on an infinite hardware-accelerated canvas.

---

## Development Roadmap & Status

| Phase | Description | Status | Key Deliverables |
| :---: | :--- | :---: | :--- |
| **Phase 1** | Foundation & Neon DB Persistence | ✅ Complete | 11 PostgreSQL Prisma models, Neon serverless adapter, demo seed data |
| **Phase 2** | Real-Time Authoritative Canvas Engine | ✅ Complete | In-memory `CanvasDocument`, 60fps pan/zoom, debounced batch writes, edge cascade |
| **Phase 3** | Dual-Provider AI Intelligence Engine | ✅ Complete | Groq + Gemini failover, candidate model resilience, Jaccard in-place mutation, confidence routing |
| **Phase 4** | Active Command Bar & AI Activity Stream | ✅ Complete | `Cmd+K` command bar, geometric layouts, live activity drawer, truthful Evidence cards (`sourceId`), query highlights |
| **Phase 5** | Speech Intelligence & Transcript Simulator | ✅ Complete | Single-flight coalescing queue ($\le 17$ RPM), 9s ceiling window, fluff filter, speech simulator dock, custom JWT auth, live captions |
| **Phase 6** | Real-Time Audio & Video Collaboration | ⏳ Next | Daily.co / LiveKit room integration, active speaker detection, dynamic audio visualizer |
| **Phase 7** | Context Zones & Workspace Clustering | 📋 Planned | Spatial context zones, perimeter tagging, isolated cluster operations |
| **Phase 8** | Export, Polish & Production Hardening | 📋 Planned | High-res SVG/PNG export, end-to-end load testing, security audit |

---

## System Architecture

```mermaid
flowchart TD
    subgraph Clients["Collaborative Clients (React 19 + Vite)"]
        UI1["Client 1 (Elena Vance)"]
        UI2["Client 2 (Marcus Sterling)"]
        CmdBar["Active Command Bar (Cmd+K)"]
        ActStream["AI Activity Stream & Evidence"]
    end

    subgraph Server["Server Layer (Node.js + Express 5)"]
        SockRelay["Socket.io Collaboration Relay (socket.js)"]
        REST["REST API Controllers (/api/rooms, /api/health)"]
        AuthMid["Auth & Identity Abstraction (auth.middleware.js)"]
    end

    subgraph StateEngine["Authoritative Canvas Engine"]
        Doc["CanvasDocument (In-Memory Single Source of Truth)"]
        LayoutEng["Geometric Layout Engine (canvasLayout.js)"]
        Dedup["Jaccard Deduplication & In-Place Mutation"]
        Debounce["100ms Debounced Write Queue"]
    end

    subgraph EffectorLayer["AI Effector & Persistence Bridge"]
        Effector["applyAIActions.js (Authoritative Effector)"]
        Hasher["hash.js (Normalized SHA-256 Fingerprint)"]
        Router["Confidence Routing Engine (validation.js)"]
    end

    subgraph Intelligence["Dual-Provider AI Intelligence Engine"]
        Fallback["withFallback (Transparent <100ms Failover)"]
        Groq["Primary: Groq LPU (Llama 3.3 70B / GPT-OSS)"]
        Gemini["Secondary: Google Gemini Flash (1.5 / 2.5 Flash)"]
        PromptEng["Ontology & Command Prompts"]
    end

    subgraph Database["Durable Storage"]
        Prisma["Prisma ORM 7 (@prisma/adapter-neon)"]
        NeonDB[("Neon Serverless PostgreSQL")]
    end

    %% Interactions
    UI1 & UI2 <-->|WebSocket Events| SockRelay
    CmdBar -->|canvas:command| SockRelay
    ActStream <-->|ai:activity / ai:proposed| SockRelay

    SockRelay <--> Doc
    SockRelay --> REST

    Doc --> LayoutEng
    Doc --> Debounce
    Debounce --> Prisma
    Doc -->|Persist-then-commit| Prisma

    SockRelay --> EffectorLayer
    Effector --> Hasher
    Effector --> Router
    Effector --> Doc
    Effector --> Prisma

    SockRelay <--> Intelligence
    Intelligence --> Fallback
    Fallback --> Groq
    Fallback --> Gemini
    Fallback --> Dedup
    Dedup --> Effector

    Prisma <--> NeonDB
```

---

## AI Action Effector & Idempotency Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client / Speech Stream
    participant Socket as Socket.io Relay
    participant AI as AI Engine (Groq / Gemini)
    participant Effector as applyAIActions.js
    participant Hasher as hash.js
    participant Doc as CanvasDocument (Memory)
    participant DB as Neon PostgreSQL (Prisma)

    Client->>Socket: Emit canvas:command or Speech Transcript
    Socket->>AI: executeWorkspaceCommand / extractMeetingElements
    AI->>AI: Parse Intent & Calculate Actions
    AI-->>Effector: Validated Actions Array
    
    loop For Each Action
        Effector->>Hasher: computeFingerprint(roomId, sourceId, type, normalizedPayload)
        Hasher-->>Effector: 64-char SHA-256 Hex Hash
        Effector->>DB: Check prisma.aIAction.findUnique({ fingerprint })
        
        alt Action Already Exists
            Effector-->>Effector: Skip duplicate (Idempotency Enforced)
        else New Action
            Effector->>DB: prisma.aIAction.create({ status: initialStatus, fingerprint })
            
            alt status == "auto" (Confidence >= 0.85 or ANSWER_QUERY)
                Effector->>Doc: doc.applyAction(action)
                Effector->>DB: prisma.aIAction.update({ status: "applied" })
                Effector->>Socket: emit "canvas:action" (Canvas Updated)
                Effector->>Socket: emit "ai:activity" (Feed Updated)
            else status == "proposed" or "clarify"
                Effector->>Socket: emit "ai:proposed" or "ai:clarify" (Review Badge)
            end
        end
    end
    
    Socket-->>Client: Result Callback & Stream Sync
```

---

## Project Status & Implementation Phases

| Phase | Description | Status | Verification |
| :--- | :--- | :--- | :--- |
| **Phase 1: Foundation & Data Architecture** | 11 Prisma models, Neon Postgres WebSocket adapter, unified response format, Elena/Marcus demo identities, and seed data. | **Complete** | Database seeded & tested |
| **Phase 2: Canvas Engine & Socket Relay** | In-memory `CanvasDocument`, 60fps infinite hardware-accelerated canvas, persist-then-commit ordering, debounced drag queue, dual edge cascade. | **Complete** | Verified 60fps pan/zoom & socket sync |
| **Phase 3: AI Intelligence & Fallback** | Dual-provider LLM abstraction (Groq + Gemini Flash), `<100ms` failover, confidence routing (`auto`, `proposed`, `clarify`), Jaccard in-place mutation. | **Complete** | 19/19 automated test suite passing |
| **Phase 4: Active Commands & Effector** | AIAction persistence effector (`applyAIActions.js`), SHA-256 fingerprint idempotency, geometric layout engine (`canvasLayout.js`), command execution. | **Complete** | 34/34 automated integration tests passing |
| **Phase 5: Simulator, Extraction & Custom Auth** | Continuous transcript simulator, single-flight coalescing queue ($\le 17$ RPM), 9s ceiling window, signal-safe fluff filter, and custom JWT auth. | **Complete** | 7/7 automated test suites passing |
| **Phase 6: Presence, Minimap & Meeting Modes** | Multiplayer live cursors, radar minimap, "Follow Me" presenter broadcast, Operational/Brainstorm modes. | Planned | Next phase |
| **Phase 7: Generative Visuals & Integrations** | Pollinations.ai imagery, Meeting Commit flow (`MeetingReport`), and Slack/Notion/Resend integration. | Planned | Roadmap |
| **Phase 8: Voice, Video & Final Polish** | Web Speech API, Groq Whisper Large v3 Turbo, dockable video bar, Dagre hierarchical auto-layout. | Planned | Roadmap |

---

## Core Ontology

### 1. The 8 Canvas Node Types
- 🎯 **Goal** (`goal`): Strategic milestones, objectives, and sprint deliverables.
- 💡 **Idea** (`idea`): Creative proposals, exploratory thoughts, and hypotheses.
- 🟢 **Task** (`task`): Assignable action items with interactive completion checkboxes.
- 🔵 **Decision** (`decision`): Agreed architectural choices, approvals, and conclusions.
- 🟣 **Question** (`question`): Open inquiries, missing requirements, and clarification requests.
- 🔴 **Risk** (`risk`): Technical debt, third-party blockers, rate limits, and failure modes.
- 👤 **Person** (`person`): Active team members and stakeholders.
- 🖼️ **Visual** (`image`): Generative concept imagery and diagrams.

### 2. The 8 Edge Relationships
`blocks` · `depends_on` · `leads_to` · `supports` · `contradicts` · `related_to` · `assigned_to` · `part_of`

---

## Geometric Layout Engine

The mathematical layout engine ([`server/src/canvas/canvasLayout.js`](file:///c:/Users/HP/Desktop/mindMesh/server/src/canvas/canvasLayout.js)) calculates deterministic `(x, y)` coordinates for canvas reorganizations:

```mermaid
flowchart LR
    subgraph Roadmap["Roadmap Layout (computeRoadmapLayout)"]
        direction TB
        Col0["Col 0: Goals"] --> Col1["Col 1: Ideas & Questions"]
        Col1 --> Col2["Col 2: Tasks"]
        Col2 --> Col3["Col 3: Decisions"]
        Col3 --> Col4["Col 4: Risks"]
    end

    subgraph RisksRight["Risks to Right (computeRisksRightLayout)"]
        direction LR
        MainCluster["Non-Risk Core Cards"] -->|Shift x > maxX + 360px| RiskCol["Dedicated Risk Column"]
    end

    subgraph Clusters["Thematic Clusters (computeClusterLayout)"]
        direction TB
        C1["Cluster: Goals & Decisions"] ~~~ C2["Cluster: Tasks"]
        C3["Cluster: Open Questions"] ~~~ C4["Cluster: Risks"]
    end
```

---

## Phase 5: Real-Time Speech Intelligence, Passive Extraction & Custom Auth

Phase 5 delivers the foundational thesis of **mindMesh**: *"The conversation becomes the canvas."* Dialogue spoken into microphones or stepped through benchmark scripts materializes automatically as interconnected visual knowledge graphs in real time.

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (React 19 + Vite)"]
        Mic["Microphone / Web Speech API"]
        Sim["SpeechIntelligenceController (4 Benchmark Scenarios)"]
        Ticker["Live Caption & Fluff Filter Ticker"]
        AuthM["AuthModal (Glassmorphic, Skeleton Loaders)"]
        AuthC["AuthContext (7-day Session Hydration)"]
    end

    subgraph Relay["Real-Time Relay & Throttling"]
        SockRelay["Socket.io Collaboration Server (socket.js)"]
        SockAuth["socketAuthMiddleware (?as=marcus > JWT > Demo)"]
        TransSock["transcript.socket.js (transcript:chunk, transcript:flush)"]
        Queue["Single-Flight Queue & Coalescing Engine (extractionQueue.js)"]
    end

    subgraph Intelligence["Passive AI Intelligence"]
        Fluff["Conversational Fluff Filter (ACTION_MARKERS Guard)"]
        Ceiling["9-Second Monologue Ceiling Window"]
        Extractor["processDialogueBatch (Attributed Transcript Formatter)"]
        DualAI["withFallback (Groq Llama 3.3 70B / Gemini Flash)"]
    end

    subgraph Effector["Authoritative Persistence Effector"]
        Eff["applyAIActions.js (Deterministic sourceId Hash)"]
        CanvasDoc["CanvasDocument (In-Memory State)"]
        PG[("PostgreSQL")]
    end

    Mic -->|Live Speech| Sim
    Sim -->|transcript:chunk| TransSock
    TransSock -->|Broadcast captions| Ticker
    TransSock --> Fluff
    Fluff -->|Drop pure fluff| Discard["Discard (Save Token Quota)"]
    Fluff -->|Preserve decisions| Queue
    Queue --> Ceiling
    Ceiling -->|Coalesced dialogue batch| Extractor
    Extractor --> DualAI
    DualAI --> Eff
    Eff --> CanvasDoc
    Eff --> PG
    Eff -->|canvas:action / ai:activity| SockRelay
    SockRelay --> Client
```

### Key Technical Pillars

1. **Single-Flight Coalescing Queue with Hard Rate Ceiling (`extractionQueue.js`)**:
   - Enforces that **only 1 extraction request is in-flight** per room at any moment.
   - A **3.5s cooldown timer** hard-caps call frequency to $\le 17\text{ RPM}$, guaranteeing full compliance with free-tier rate limits without dropping conversational context.
   - Any utterances occurring while an extraction is in-flight or mid-cooldown buffer into a FIFO accumulator and flush together in a single batch once the lock clears.
2. **9-Second Continuous Monologue Ceiling Window**:
   - Tracks `firstChunkTime` on the empty-to-non-empty buffer transition.
   - Clamps debounce timers so that continuous single-speaker speech with sub-1.5s pauses cannot postpone extraction indefinitely; extraction is forced within 9 seconds.
3. **Signal-Safe Conversational Fluff Filter**:
   - Pure filler (*"yeah"*, *"uh-huh"*, *"okay cool"*, *"sounds good"*) is safely discarded before reaching the queue, saving 30–40% token quota.
   - Whitelist filter is strictly guarded by `ACTION_MARKERS = /\b(not|instead|assign|take|takes|but|wait|actually|no|let's|cancel|remove|block|blocks)\b/i`. Short handoffs (*"Sam takes it"*, *"Sam, not Mike"*, *"No, wait"*) are strictly preserved.
4. **Deterministic `sourceId` Batch Window Hash**:
   - Before flushing, dialogue chunks are sorted deterministically to compute an immutable SHA-256 fingerprint:
     $$\text{sourceId} = \text{stream}:\text{roomId}:\text{sha256(sortedChunks).slice(0, 16)}$$
   - Guaranteed idempotency: retries or failover reprocessing of the same dialogue window produce identical fingerprints, triggering PostgreSQL `@unique([roomId, fingerprint])` deduplication with zero duplicate rows.
5. **Authoritative Single-Effector Invariant**:
   - Extracted actions route directly into `applyAIActions(roomId, actions, { sourceId, io })`. Natural language workspace commands (Phase 4) and passive speech extraction (Phase 5) share the exact same effector, audit trail, deduplication, and canvas mutation pipeline.
6. **Real Custom Authentication & Priority Precedence**:
   - Passwords hashed with bcrypt (10 salt rounds).
   - 7-day `httpOnly`, `sameSite: "lax"` JWT session cookie.
   - Decoupled `isDemo` flag separating authenticated accounts from guest personas.
   - Priority hierarchy:
     1. `?as=marcus` / `?as=elena` query parameter (developer multi-window demo override)
     2. Authenticated JWT cookie session
     3. Default guest demo user (`demo-user-1`)
   - Re-runs Socket.io handshake on login/signup/logout to keep server-side `socket.data.user` synchronized.
7. **Interactive Speech Intelligence Simulator Dock (`SpeechIntelligenceController.jsx`)**:
   - 4 pre-loaded benchmark scenarios (*Canonical Onboarding Debate*, *Live Reassignment & In-Place Correction*, *Architecture & Risk Mitigation*, *Fluff Filter & Short Decision Handoff*).
   - Play/Pause with auto-step pacing, Step Next button, Speed multipliers (`1x`, `2x`, `3x`), and Reset Buffer.
   - Web Speech API integration (`SpeechRecognition`) with `isMicActiveRef` ensuring uninterrupted continuous listening.
   - Floating live caption ticker displaying real-time speech and *FILLER* status badges.

---

## Architectural Invariants & Guarantees

1. **Persist-Then-Commit Ordering**: All non-debounced canvas actions commit to Neon PostgreSQL before updating in-memory `CanvasDocument` state, preventing silent memory drift on database write errors.
2. **Deterministic Payload Hashing**: Object keys are sorted recursively via `normalizePayload()` before SHA-256 hashing (`roomId:sourceId:type:normalizedPayload`), enforcing the `@unique` constraint on `AIAction.fingerprint` and dropping duplicate network retries.
3. **Dual Edge Cascade**: Node deletion triggers an immediate in-memory sweep of all connected edges in `CanvasDocument`, mirrored atomically by `prisma.canvasEdge.deleteMany` in PostgreSQL.
4. **Phantom Resurrection Guard**: `MOVE_NODE` validates that target nodes exist before setting coordinates, preventing race conditions with concurrent deletions.
5. **Centralized Confidence Routing Policy**:
   - `confidence >= 0.85` or `ANSWER_QUERY` $\to$ `"auto"` (executed directly onto canvas).
   - `0.50 <= confidence < 0.85` $\to$ `"proposed"` (surfaced in AI Activity Stream with Apply/Dismiss chips).
   - `confidence < 0.50` $\to$ `"clarify"` (surfaced with amber review warning).
   - **Destructive Gating**: `DELETE_NODE` and `DELETE_EDGE` are permanently gated to `"proposed"`.
6. **Candidate Model Resilience**: The primary provider automatically falls back across available models (`config.groqModel`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`) on HTTP 404, gracefully surviving per-organization deprecations.
7. **End-to-End Data Lineage (`sourceId` Join Key)**: Both `CREATE_NODE` and `UPDATE_NODE` actions inject the authoritative `AIAction.id` into `CanvasNode.sourceId` and persist it to PostgreSQL, ensuring that Evidence Cards display true conversational rationale and verbatim `metadata.sourceQuote` across creation and live corrections.
8. **Chronological Stream Integrity**: Self-approval and live WebSocket action updates match by ID/fingerprint and update records in-place rather than unshifting, preventing approved actions from jumping to the top of the feed.
9. **Single-Flight Coalescing & Hard Rate Ceiling**: Only 1 extraction request is in-flight per room at any time; bursts of incoming dialogue coalesce in arrival order; a 3.5s cooldown window guarantees $\le 17$ RPM.
10. **Continuous Monologue Ceiling Window**: Debounce delay cannot defer extraction beyond 9 seconds from the first utterance in a dialogue window.
11. **Idempotent Dialogue Window Fingerprint**: Chunks are sorted deterministically before computing the `sourceId` hash, ensuring identical retry windows generate identical fingerprints and produce zero duplicate rows.
12. **Zero Duplicate Effector Pipeline**: Both active workspace commands and passive speech extraction route authoritatively through `applyAIActions()`.
13. **Zero-Friction Guest & Demo Priority Hierarchy**: `?as=marcus` / `?as=elena` demo parameter $\to$ authenticated session $\to$ default guest identity.

---

## Socket.io & REST API Reference

### Real-Time Socket Events

| Event Name | Direction | Payload / Description |
| :--- | :--- | :--- |
| `canvas:join` | Client $\to$ Server | `{ roomId, user }`: Joins room channel, returns authoritative state (`canvas:init`), broadcasts presence. |
| `canvas:action` | Bidirectional | `{ action }`: Atomic canvas action (`CREATE_NODE`, `UPDATE_NODE`, etc.). |
| `canvas:batch_action` | Bidirectional | `{ actions: [...] }`: Batch atomic action execution. |
| `canvas:command` | Client $\to$ Server | `{ prompt, workspaceContext }`: Natural language command (`"Move risks to the right"`, `"What did we decide?"`). |
| `canvas:command:result` | Server $\to$ Client | `{ intent, summary, answer, highlightedNodeIds, actions }`. |
| `ai:activity` | Server $\to$ Room | Live feed broadcast of applied `AIAction` row. |
| `ai:proposed` | Server $\to$ Room | Broadcast of proposed action requiring user approval. |
| `ai:clarify` | Server $\to$ Room | Broadcast of low-confidence action requiring clarification. |
| `ai:action:approve` | Client $\to$ Server | `{ actionId }`: User approves proposed action; applies to canvas and emits `ai:activity`. |
| `ai:action:reject` | Client $\to$ Server | `{ actionId }`: User dismisses proposed action; updates DB to `status: "rejected"`. |
| `cursor:move` | Client $\to$ Server | Throttled cursor coordinates `(x, y)` broadcast to peers as `cursor:moved`. |

### Unified REST Endpoints

All JSON endpoints strictly adhere to the unified format:
- **Success**: `{ "success": true, "message": "...", "data": { ... } }`
- **Failure**: `{ "success": false, "message": "...", "errors": [ ... ] }`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, uptime, and environment check. |
| `GET` | `/api/rooms/:roomId` | Room metadata and authorization check. |
| `GET` | `/api/rooms/:roomId/ai-actions` | Fetches recent `AIAction` history for Activity Stream hydration. |
| `POST` | `/api/rooms/:roomId/ai-actions/:actionId/approve` | Approves and executes a proposed action via REST. |
| `POST` | `/api/rooms/:roomId/ai-actions/:actionId/reject` | Rejects/dismisses a proposed action via REST. |

---

## Getting Started

### 1. Prerequisites
- Node.js (v18 or higher; v24 recommended)
- npm (v9+)
- A [Neon](https://neon.tech) Serverless PostgreSQL database URL
- At least one Groq or Google Gemini API key

### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and configure:
# DATABASE_URL="postgresql://..."
# GROQ_API_KEYS="gsk_..."
# GEMINI_API_KEYS="AIzaSy..."

# Apply database migrations
npx prisma migrate dev --name init

# Seed database with demo identities (Elena Vance & Marcus Sterling)
npm run prisma:seed

# Run Phase 3 AI tests (19 checks)
node test/phase3_ai.test.js

# Run Phase 4 Backend tests (34 checks)
node test/phase4_backend.test.js

# Start backend server
npm run dev
```
The server will start on port `3000`. Test the health check at `http://localhost:3000/api/health`.

### 3. Frontend Setup
```bash
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Access the application at `http://localhost:5173`. Add `?as=marcus` to simulate multi-user collaboration in a second browser tab.

---

## Directory Structure

```
mindMesh/
├── client/                           # React 19 + Vite Frontend
│   ├── src/
│   │   ├── api/                      # REST & WebSocket client instances
│   │   ├── components/
│   │   │   ├── canvas/               # InfiniteCanvas, CanvasNode, CanvasEdge
│   │   │   ├── command/              # ActiveCommandBar (Floating OS bar)
│   │   │   ├── activity/             # ActivityStream & EvidenceCard
│   │   │   └── meeting/              # SpeechIntelligence & VideoConference
│   │   ├── context/                  # RoomContext (WebSockets & presence)
│   │   ├── hooks/                    # useCanvas, useAIActions, useSpeechRecognition
│   │   └── utils/                    # canvasConstants, color tokens
│   └── package.json
│
├── server/                           # Node.js + Express 5 Backend
│   ├── prisma/
│   │   ├── schema.prisma             # 11 PostgreSQL data models
│   │   └── seed.js                   # Demo users & room seeding
│   ├── src/
│   │   ├── ai/
│   │   │   ├── applyAIActions.js     # Effector service & DB persistence
│   │   │   ├── commands.js           # Workspace command execution engine
│   │   │   ├── validation.js         # Confidence routing & action sanitization
│   │   │   ├── prompts/              # Extraction & Command system prompts
│   │   │   └── providers/            # Groq & Gemini with transparent failover
│   │   ├── canvas/
│   │   │   ├── canvasDocument.js     # Authoritative in-memory state container
│   │   │   ├── canvasLayout.js       # Geometric spatial layout engine
│   │   │   ├── canvasDeduplication.js# Jaccard token & semanticKey in-place mutator
│   │   │   ├── canvasPersistence.js  # Neon PostgreSQL Prisma writer
│   │   │   └── canvasValidation.js   # Payload schema validators
│   │   ├── realtime/
│   │   │   ├── socket.js             # Socket.io server bootstrap
│   │   │   └── canvas.socket.js      # Real-time action, command & presence relays
│   │   ├── routes/                   # REST API routes (room, ai)
│   │   ├── utils/
│   │   │   ├── hash.js               # Normalized SHA-256 fingerprinting
│   │   │   └── response.js           # Unified JSON response formatters
│   │   └── app.js                    # Express app configuration & middleware
│   ├── test/
│   │   ├── phase3_ai.test.js         # 19 Phase 3 AI extraction tests
│   │   └── phase4_backend.test.js    # 34 Phase 4 backend integration tests
│   └── package.json
│
├── ROADMAP.md                        # Master 8-Phase Architectural Plan
├── implementation-plan.md            # Comprehensive technical design document
└── README.md                         # This document
```

---

## Author

Designed and engineered by **Sahil Sameer** ([@SahilSameer18](https://github.com/SahilSameer18)).

---

## License

ISC License
