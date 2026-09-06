# mindMesh — Master Plan (v4, Full Scope)

**Tagline**: *the conversation becomes the canvas.*

Solo build. PERN + Prisma + Neon core, free-tier AI and integration providers.
This version incorporates the full brief: meeting modes, live presence (cursors,
minimap, follow-me), generative visuals, and a commit → report → Slack/Notion flow —
on top of the frozen core architecture from earlier iterations, resequenced so the
AI-driven canvas loop gets proven before auth, integrations, or video.

---

## 1. Vision & product thesis

The conversation becomes the canvas. People talk (or type), the AI extracts ideas,
decisions, questions, and tasks in real time, and turns them into a connected knowledge
graph — or, in brainstorm sessions, generative visuals — on a shared workspace that
updates live for everyone in the room. Rooms are persistent projects, not disposable
meetings: leave, come back a month later, everything is still there.

**Demo narrative**: *"We don't take notes for you. We think with you."* Talk → AI
understands → canvas changes → user corrects the AI → AI adapts → team sees it →
commit. That arc, not a feature checklist, is what the submission should feel like.

**Product thesis — don't let scope dilute this**: most collaboration tools record what
people say. This workspace turns what people say into a living model of what the team
(or a single person, thinking alone) thinks. Not the video, not the canvas library, not
any single AI provider — the living model of thinking is the product.

**Two audiences, both real**: teams in a meeting, and solo users narrating their own
thinking out loud to organize it. Design for both from day one — solo mode is just a
room with one participant and no video required.

---

## 2. Meeting modes (first-class concept)

Modes change both what the AI does and what renders on the canvas. Store as `Room.mode`.

| Mode | Behavior | Output |
|---|---|---|
| **Brainstorm** | loose, generative, low structure | generated images/infographics alongside light node tagging |
| **Operational** | structured, topic-scoped, tracks gaps | topic outline pre-loaded, live population under each topic, explicit unresolved-question list |
| **Solo** | same engine, single participant, no video required | either of the above, narrator-driven |

The AI must be steerable **at the mode/behavior level**, mid-session — "stop making
boxes, give me visuals instead" should shift its whole output strategy, not just the
next single node. Implement this as a runtime override on top of the room's mode
default: a command like `ai.setSessionBehavior(roomId, instruction)` that adjusts the
system prompt for subsequent extractions in that room, not a one-off action.

A meeting can also start with an explicit **context-setting prompt** — before anyone
talks, the room owner tells the AI how to behave for this session ("you're an
operational meeting assistant, track owners and blockers"). Store this as a
`Room.systemContext` string, prepended to every extraction call for that room.

---

## 3. Tech stack (full)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React + Tailwind v4 + Custom Hardware-Accelerated 2D Canvas** | Infinite hardware-accelerated viewport with SVG edge curves and DOM nodes (custom 60fps canvas engine — no React Flow bloat) |
| Live collaborative state | **Socket.io broadcast + In-Memory `CanvasDocument`** | Authoritative in-memory state container, 100ms throttled debounced persistence for drag events, client-side UUID generation with ack-based rollback |
| Durable state | **Neon Postgres + Prisma** | Single source of truth via `@prisma/adapter-neon` WebSocket connection |
| Application events | **Socket.io (consolidated connection)** | Canvas actions + presence (peer-joined/left, cursors, minimap, follow-me) + app events |
| Video | **LiveKit** | Optional scope — add in Phase 8; canvas + AI is the demo |
| Speech-to-text | **Dual-Tier: Web Speech API + Groq Whisper Large v3 Turbo** | Web Speech API for zero-latency local captions; Groq Whisper Large v3 Turbo (`whisper-large-v3-turbo` with 7,200 audio sec/hr free) for technical jargon and accents |
| AI — primary | **Groq (Llama 3.3 70B Versatile)** | Free, ultra-fast (~300 t/s, <400ms TTFT), 30 RPM, 12,000 TPM, 1,000 RPD (~2.75 hrs meetings/day) |
| AI — fallback | **Gemini 2.0 / 1.5 Flash** | Free, high reliability, 15 RPM, 1,000,000 TPM, 1,500 RPD (~4.15 hrs meetings/day) |
| Generative visuals (brainstorm mode) | **Pollinations.ai** (`image.pollinations.ai/prompt/{text}`) | Completely free, zero API key, single GET request — right fit for a no-budget MVP |
| Slack integration | **Incoming Webhooks** | Free, formatted Block Kit summary posted to incoming webhook |
| Notion integration | **Notion API (Integration Token)** | Creates structured meeting page with summary & tasks in user database |
| Email report | **Resend** | Free tier transactional email API for HTML meeting reports + markdown export |
| Auth | **Custom (bcrypt + JWT in httpOnly cookies)** | See §5 — custom secure auth, room member roles, verified session cookies |

---

## 4. Data model (Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())

  memberships RoomMember[]
}

model RoomMember {
  id       String   @id @default(cuid())
  roomId   String
  userId   String
  role     String   @default("member") // owner | member
  joinedAt DateTime @default(now())

  room Room @relation(fields: [roomId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@unique([roomId, userId])
}

model InviteLink {
  id        String   @id @default(cuid())
  roomId    String
  token     String   @unique
  expiresAt DateTime?
  createdAt DateTime @default(now())

  room Room @relation(fields: [roomId], references: [id])
}

model Workspace {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  rooms     Room[]
}

model Room {
  id            String   @id @default(cuid())
  workspaceId   String
  name          String
  mode          String   @default("operational") // brainstorm | operational | solo
  systemContext String?  // pre-meeting instruction to the AI, set by the room owner
  createdAt     DateTime @default(now())

  workspace        Workspace @relation(fields: [workspaceId], references: [id])
  members          RoomMember[]
  invites          InviteLink[]
  nodes            CanvasNode[]
  edges            CanvasEdge[]
  transcriptChunks TranscriptChunk[]
  aiActions        AIAction[]
  integrations     RoomIntegration[]
  reports          MeetingReport[]
}

model ContextZone {
  id     String @id @default(cuid())
  roomId String
  name   String  // a named sub-area of the canvas people can navigate to independently
  x      Float
  y      Float
  zoom   Float  @default(1.0)
}

model CanvasNode {
  id          String  @id @default(cuid())
  roomId      String
  type        String  // goal | idea | task | decision | question | risk | person | image
  text        String
  semanticKey String? // stable target for UPDATE_NODE — see §8
  x           Float
  y           Float
  metadata    Json?   // { assignee, status, priority, sourceQuote, imageUrl, ... }

  sourceType String? // manual | transcript | ai_command
  sourceId   String? // TranscriptChunk or AIAction id

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  room Room @relation(fields: [roomId], references: [id])

  @@index([roomId])
  @@index([roomId, semanticKey])
}

model CanvasEdge {
  id     String  @id @default(cuid())
  roomId String
  fromId String
  toId   String
  label  String?
  type   String? // blocks | depends_on | leads_to | supports | contradicts | related_to | assigned_to | part_of

  room Room @relation(fields: [roomId], references: [id])
}

model TranscriptChunk {
  id        String   @id @default(cuid())
  roomId    String
  speaker   String
  text      String
  createdAt DateTime @default(now())

  room Room @relation(fields: [roomId], references: [id])
}

model AIAction {
  id          String   @id @default(cuid())
  roomId      String
  type        String   // CREATE_NODE | UPDATE_NODE | DELETE_NODE | CREATE_EDGE | DELETE_EDGE | MOVE_NODE
  payload     Json
  confidence  Float?
  reason      String?
  status      String   // proposed | applied | rejected | failed
  fingerprint String   @unique // hash(roomId + sourceTranscriptId + type + normalizedPayload)

  createdAt DateTime @default(now())

  room Room @relation(fields: [roomId], references: [id])
}

model RoomIntegration {
  id         String  @id @default(cuid())
  roomId     String
  provider   String  // slack | notion
  config     Json    // { webhookUrl } for Slack, { token, databaseId } for Notion

  room Room @relation(fields: [roomId], references: [id])
}

model MeetingReport {
  id         String   @id @default(cuid())
  roomId     String
  summary    String
  tasks      Json     // extracted action items at commit time
  emailedTo  String?
  createdAt  DateTime @default(now())

  room Room @relation(fields: [roomId], references: [id])
}
```

---

## 5. Authentication (custom build)

Own this end-to-end. Design is documented here early since it touches the data model,
but implementation is deliberately **not** the first thing you build — see §13, Phase 5
(Step 5.4). Prove the AI → canvas loop with a temporary demo user first; add this once the
product itself works, provided the "current user" lookup was abstracted from day one so
the swap is cheap.

**Password handling**: hash with `bcrypt` (10-12 salt rounds) or `argon2` if you want
the stronger, more modern default — either is fine for this scale, don't roll your own
hashing. Never store or log plaintext passwords, ever, including in error messages.

**Session strategy**: JWT stored in an **httpOnly, secure, sameSite=lax cookie** — not
`localStorage`. httpOnly means client-side JS (and any XSS payload) can't read the
token; `localStorage` JWTs are readable by any script on the page, which is the most
common real-world auth mistake to avoid here. Use a short-lived access token (e.g. 15
min) plus a longer-lived refresh token, or just a single reasonably-short session token
if you want to keep it simple for a solo build — either is defensible, just don't issue
a token that lives forever with no rotation.

**Core endpoints**:
```
POST /auth/signup   → hash password, create User, issue session cookie
POST /auth/login    → verify password, issue session cookie
POST /auth/logout   → clear cookie
GET  /auth/me       → return current user from a valid session
```

**Middleware**:
```js
function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "not authenticated" });
  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    res.status(401).json({ error: "invalid session" });
  }
}

async function requireRoomAccess(req, res, next) {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.roomId, userId: req.user.id } }
  });
  if (!membership) return res.status(403).json({ error: "not a member of this room" });
  req.roomRole = membership.role;
  next();
}
```

**Room invites**: generate an `InviteLink` with a random token (and optional
expiry), share as a URL (`/join/{token}`). Visiting it while logged in creates a
`RoomMember` row with role `member`; the room creator is seeded as `owner` at room
creation time.

**Rate limiting**: throttle `/auth/login` and `/auth/signup` specifically (a simple
in-memory or Redis-backed limiter keyed by IP is enough for a solo build) — this is the
one endpoint pair that gets brute-forced if left open.

**Socket.io + auth**: verify the session cookie/token during the Socket.io handshake
(`io.use((socket, next) => {...})`), not after — this is what lets cursors, minimap
labels, and the Activity stream show real user names instead of anonymous IDs, and
prevents an unauthenticated connection from ever joining a room's Socket.io channel.

**What to skip for now**: email verification, password reset flows, and OAuth
(Google/GitHub login) are all reasonable v2 additions but not blockers for a working
demo — don't let them delay the core AI loop (Phases 1–4).

---

## 6. Core architectural principles (unchanged, still correct)

- **The AI never writes to the DB directly.** It produces `AIAction` proposals →
  validated → deduplicated → confidence-routed → applied via `CanvasDocument`.
- **`CanvasDocument` is the single application-level source of truth**, fanning out to
  a Socket.io broadcast (live representation, other connected clients) and Prisma
  (durable representation). No CRDT layer for now — see §10.
- **The AI never outputs positions.** Semantic structure only; a layout engine (grid for
  MVP, dagre for hierarchical later) decides placement.
- **Destructive actions are never auto-applied**, regardless of confidence.
- **Confidence is a routing signal, not truth** — combine it with action type in one
  central `routeAction()` function.

```js
function routeAction(action) {
  if (["DELETE_NODE", "DELETE_EDGE"].includes(action.type)) return "proposed";
  if (action.confidence >= 0.85) return "auto";
  if (action.confidence >= 0.5)  return "proposed";
  return "clarify";
}
```

---

## 7. AI provider abstraction (error-aware fallback)

- **Primary Provider**: Groq (`llama-3.3-70b-versatile` — free, ~300 tokens/sec, structured JSON mode).
  - Rate limits: 30 Requests/min (RPM), 12,000 Tokens/min (TPM), 1,000 Requests/day (RPD) (~2.75 hours of meetings/day).
- **Secondary Fallback**: Google Gemini 2.0 / 1.5 Flash (`gemini-2.0-flash` — free, high reliability, massive 1M TPM headroom).
  - Rate limits: 15 Requests/min (RPM), 1,000,000 Tokens/min (TPM), 1,500 Requests/day (RPD) (~4.15 hours of meetings/day).
- **Combined Meeting Capacity**: ~7 hours of active team meetings every day for $0.00.
- **Failover Behavior**: Seamless failover on HTTP `429` (Rate Limit Exceeded) or `500` server spikes. If Groq hits a limit, `withFallback` instantly routes the exact request to Gemini Flash in < 100ms with zero user disruption.
- **Context Priming (Phonetic Auto-Correction)**:
  - System prompt injects room participant roster (`[Elena Vance (Product Lead), Marcus Sterling (Tech Lead)]`) and active canvas entity keys so the LLM automatically deduces and corrects speech-to-text phonetic mishears (e.g. *"off flow"* → *"auth flow"*, *"prism a"* → *"Prisma"*).

```js
// ai/index.js
const primary = groq, fallback = gemini;

function shouldFallback(error) {
  const code = error.status || error.code;
  return code === 429 || code === 500 || code === "ETIMEDOUT";
}

async function withFallback(fn, ...args) {
  try { return await primary[fn](...args); }
  catch (error) {
    if (!shouldFallback(error)) throw error;
    try { return await fallback[fn](...args); }
    catch { return { actions: [], status: "failed" }; }
  }
}

export const ai = {
  extractMeetingElements: (...a) => withFallback("extractMeetingElements", ...a),
  executeCanvasCommand:   (...a) => withFallback("executeCanvasCommand", ...a),
  generateVisual:         (...a) => withFallback("generateVisual", ...a), // brainstorm mode → Pollinations
  summarizeMeeting:       (...a) => withFallback("summarizeMeeting", ...a),
  reorganizeCanvas:       (...a) => withFallback("reorganizeCanvas", ...a),
  setSessionBehavior:     (...a) => withFallback("setSessionBehavior", ...a),
};
```

---

## 8. AI extraction pipeline

**Speaker Attribution Pipeline**:
- Each client microphone emits attributed speech chunks `{ speaker, userId, text, timestamp }`.
- The server dialogue buffer formats incoming chunks as a structured script:
  `[10:14:02] Elena Vance: "..." \n [10:14:05] Marcus Sterling: "..."`.
- Enables precise entity and task attribution (e.g., resolving pronouns like "I will take..." to the active speaker).

**Adaptive Ingestion Triggering with Single-Flight Coalescing (Replacing Blind 10s Timer)**:
1. *Trigger Conditions*: Speaker turn switch (Elena → Marcus), 1.5s natural pause, or 8–10s ceiling monologue window.
2. *Single-Flight Lock & Cooldown (3.5s)*: Enforces that only one LLM extraction can be in-flight at any time. If a speaker switch or pause fires while a request is in-flight or within the 3.5s cooldown window, incoming dialogue chunks are buffered into an accumulator queue. When the lock/cooldown clears, all accumulated dialogue flushes in one single batch.
3. *Rate Limit Ceiling Enforcement*: Hard-caps call frequency to $\le 17\text{ RPM}$, guaranteeing full compliance with Groq's 30 RPM and Gemini's 15 RPM free quotas, while eliminating out-of-order response race conditions.
4. *Conversational Filler Filter*: Discards chunks under 4 words of conversational fluff (*"yeah"*, *"uh-huh"*, *"okay"*), saving 30–40% of API call budget.

**Context manager** — roll up recent transcript, existing nodes (with `semanticKey`),
existing relationships, participants, plus the room's `mode` and `systemContext`. The
ontology prompt must instruct the model to reuse an existing `semanticKey` when it
recognizes the same concept, rather than mint a new one. Still run
semanticKey-match-first, fuzzy-text-match-fallback in the dedup step regardless.

**Mode-aware prompting**: the same extraction call branches on `Room.mode`:
- `operational` → extract goal/task/decision/question/risk nodes against the pre-loaded
  topic outline; explicitly flag anything left unresolved.
- `brainstorm` → extract a short visual prompt describing the idea just discussed, call
  `ai.generateVisual()` (Pollinations), attach the resulting image URL as node metadata
  alongside a light-touch idea node.
- `solo` → same as operational or brainstorm depending on a secondary toggle, just
  without participant-attribution logic.

**Confidence tiers** — see `routeAction()` in §6. Never bypass this regardless of mode.

**Two interaction modes** (orthogonal to meeting mode above):
- **Passive**: transcript → extraction → nodes appear automatically, tiered by
  confidence.
- **Active**: explicit command → `ai.executeCanvasCommand()` — build this aggressively,
  it's the clearest differentiator from "transcript → sticky notes" competitors.

**Canonical test paragraph** for validating multi-node + relationship extraction:

> "We need to improve onboarding. Mike will redesign the dashboard, but analytics needs
> to be ready first."

Should produce a `GOAL`, a `TASK` assigned to Mike, an `Analytics` node, and a `blocks`
edge — all validated, deduplicated, visible in the Activity stream with evidence.

---

## 9. AI Activity stream + evidence ("why this exists")

Build this right after your first working AI command (see build order, §13, Phase 4) — it's
cheap once `AI → AIAction → Canvas` exists, and doubles as your debugging tool while you
build the harder passive extraction pipeline.

```
✨ AI ACTIVITY
11:42:03  Detected a goal — "Improve onboarding"
11:42:11  Detected task — "Redesign dashboard" → Mike
11:42:18  Detected dependency — Analytics → Dashboard redesign
```

Clicking any AI-generated node shows:

```
WHY THIS EXISTS
Task — Redesign dashboard
AI detected this because: "Mike can handle the dashboard redesign."
Source: 🎙 Mike · 11:42:11        [View transcript]
```

This is a headline feature, not a debug tool — it's what proves the AI understood the
conversation instead of pattern-matching keywords.

---

## 10. Real-time collaboration & presence

**Document sync — start simple, no CRDT**: skip Yjs initially. When a client creates,
moves, edits, or deletes a node, `dispatchCanvasAction()` does three things: (1) apply
the change to local React state immediately for a snappy feel, (2) emit the action over
Socket.io to the server, (3) server validates, persists via Prisma, and broadcasts the
same action to every other client in the room, which applies it to their own React
state on receipt.

```js
// client
function dispatchCanvasAction(action) {
  applyToLocalState(action);       // optimistic local update
  socket.emit("canvas:action", action);
}

socket.on("canvas:action", (action) => {
  if (action.originClientId !== myClientId) applyToLocalState(action);
});
```

```js
// server
socket.on("canvas:action", async (action) => {
  const validated = validateAction(action);
  if (!validated) return;
  await persistToPostgres(validated);
  io.to(roomId).emit("canvas:action", validated); // broadcast to everyone, including sender for confirmation
});
```

**Why this is enough for now**: without a CRDT, two people editing the exact same node
at the exact same instant can produce a last-write-wins glitch — one edit silently
overwrites the other. For a meeting tool this collision is rare in practice (people
mostly touch different nodes), so the failure mode is a minor annoyance, not a broken
demo. This also means `CanvasDocument` doesn't change shape later — if you add Yjs as a
stretch goal, it slots in as an alternative transport for the same dispatched actions,
not a rewrite.

**Debounce drag events** specifically — during a node drag, throttle `MOVE_NODE`
broadcasts to roughly every 50-100ms rather than every pixel of movement, and persist
the final position once on drag-end.

**Key Invariants & Field-Tested Guardrails (Phase 2)**:
- *Persist-then-commit ordering*: In `CanvasDocument.applyAction()`, all non-debounced actions commit to Neon PostgreSQL before updating in-memory state, preventing canonical memory drift on DB write failure.
- *Debounced `MOVE_NODE`*: In-memory position updates immediately at 60fps; DB writes are queued in a 100ms debounce throttle, flushed immediately on unmount or conflicting actions.
- *Dual cascade on `DELETE_NODE`*: Connected edges are cleaned up in memory in `CanvasDocument` and in database in `canvasPersistence.js` via `deleteMany`.
- *Idempotent edge creation*: `CREATE_EDGE` uses `upsert()` to survive retry drops without unique constraint crashes.
- *Update field whitelist*: `updateNodeAction()` enforces strict field whitelisting (`text`, `type`, `semanticKey`, `x`, `y`, `metadata`) to block `id` or `roomId` mutation.
- *Room authorization enforcement*: Socket handlers strictly use authoritative `socket.roomId` set during `canvas:join`, ignoring client-supplied room IDs to prevent cross-room write bypass.
- *Consolidated `canvas:join`*: Single event handles room joining, emits `canvas:init` with full state to caller, and broadcasts `presence:peer-joined` to room peers.
- *Client-side UUID timing & ack rollback*: Client generates `crypto.randomUUID()` before local insert and socket emission; snapshots state and rolls back if server returns `{ success: false }`.
- *Dynamic room verification (Phase 5)*: In Phase 2, `demo-room` existence is guaranteed by `seed.js`. When custom rooms and invite links arrive in Phase 5, `canvas:join` must verify room existence via `getOrCreateRoom` upfront so non-existent room IDs fail with a clean error rather than throwing a foreign-key constraint violation on node/edge creation.
- *Connecting click gating*: Node clicks only trigger connection completion when an active connection drag (`connectingNodeId`) is in progress.

**Cursors, minimap, follow-me**: all three are just more event types on the same
Socket.io channel, no separate system needed:
- Cursors: each client emits its own pointer position on a short interval; others
  render it as a colored dot keyed by user.
- Minimap: each client also emits its own viewport bounds (x, y, zoom); a small
  fixed-position panel renders every participant's viewport as a rectangle over a
  zoomed-out canvas thumbnail.
- Follow me: one participant emits a `FOLLOW_ME` event with their current viewport;
  every other client snaps its own camera to match, with a "stop following" toggle so
  it doesn't hijack permanently.

**Contextual zones**: `ContextZone` gives named, saved camera positions on one shared
canvas — "the roadmap area," "the risks area" — so a room isn't one flat infinite
canvas; people can navigate to a zone by name, and `FOLLOW_ME` can snap to a zone too.

**If you end up with spare time**: swap the plain broadcast for Yjs (e.g. via
`y-socket.io`) to get real conflict-free merging instead of last-write-wins. Treat it as
a polish-phase upgrade, not a Phase 0 dependency.

---

## 11. Commit flow (finalize → report → integrations)

A distinct, user-triggered action — separate from continuous passive extraction:

```
User clicks "Commit"
        ↓
ai.summarizeMeeting(transcript, canvasState)
        ↓
MeetingReport { summary, tasks }  written to Postgres
        ↓
   ┌────────────┬─────────────┬───────────────┐
   ↓            ↓             ↓               ↓
Email (Resend) Slack webhook  Notion page   Room stays persistent,
to participant  (if configured) (if configured)  reopen anytime
```

- **Email**: Resend, plain transactional template — summary + task list + a link back
  to the room.
- **Slack**: if `RoomIntegration` has a `slack` config, POST a formatted summary to the
  stored webhook URL. No OAuth needed for this simplest version.
- **Notion**: if configured, create a page in the user's database via the Notion API
  using their stored integration token — one page per commit, summary + tasks as
  content blocks.
- Commit doesn't delete or freeze the room — it's a checkpoint, not a close-out. The
  room stays open for the next session.

---

## 12. Node & UI visual language

- 🎯 Goal · 💡 Idea · 🟢 Task (assignee + status) · 🔵 Decision · 🟣 Question · 🔴 Risk ·
  👤 Person · 🖼️ Generated visual (brainstorm mode)
- Canvas is the hero. AI Activity panel stays small — don't let it become "ChatGPT with
  a canvas attached."
- Bottom bar: video tiles (when active, and optional — see §13) + mic/camera/screenshare
  + the Active Command Bar (below) + a visible mode indicator + the Commit button.

### The Active Command Bar — the headline feature

A permanent input at the bottom of the canvas: `✨ Ask your workspace...`. This should
feel like the canvas has an operating system, not like a chat window bolted onto a
whiteboard. Rotate placeholder text through a few examples so people know what it's for
without being told:

- "Turn this into a roadmap"
- "What are we missing?"
- "Show me all dependencies"
- "Group these ideas"
- "Make this more visual"
- "Move risks to the right"
- "What did we decide?"

To make these real rather than aspirational, the action vocabulary needs two additions
beyond the CRUD actions already defined in §6:

```js
const allowedActions = [
  "CREATE_NODE", "UPDATE_NODE", "DELETE_NODE",
  "CREATE_EDGE", "DELETE_EDGE", "MOVE_NODE",
  "REORGANIZE_LAYOUT", // e.g. "turn this into a roadmap" — model returns a target
                       // arrangement (grouping/ordering), layout engine computes actual
                       // x/y for existing nodes; still no positions from the model itself
  "ANSWER_QUERY",      // e.g. "what did we decide?" — read-only, no canvas mutation;
                       // returns a short answer + a list of node ids to highlight
];
```

`ANSWER_QUERY` is always safe to auto-run regardless of confidence — it can't damage
the canvas, it only reads and highlights. `REORGANIZE_LAYOUT` follows the same
confidence routing as everything else in §6, since it does mutate node positions.

Mapping the example commands to actions:

| Command | Action(s) |
|---|---|
| "Turn this into a roadmap" | `REORGANIZE_LAYOUT` (hierarchical grouping) |
| "What are we missing?" | `ANSWER_QUERY` + possibly `CREATE_NODE` for a surfaced `question` |
| "Show me all dependencies" | `ANSWER_QUERY` → highlight nodes/edges of type `blocks`/`depends_on` |
| "Group these ideas" | `REORGANIZE_LAYOUT` (cluster by similarity/theme) |
| "Make this more visual" | mode hint → `ai.generateVisual()` for the selected node(s) |
| "Move risks to the right" | `REORGANIZE_LAYOUT` filtered to `type: risk` |
| "What did we decide?" | `ANSWER_QUERY` → highlight `decision` nodes, short spoken/written summary |

---

## 13. Build order (Streamlined 8 Phases)

De-risk by proving the AI → canvas loop — the actual differentiator — before auth,
integrations, or video. Phased sequence matching `ROADMAP.md`:

### Phase 1: Foundation & Data Architecture (Complete & Verified)
*Goal: Establish database models, seed demo identities, server foundation, and API contracts.*
- **1.1 Prisma Schema & Data Models (`server/prisma/schema.prisma`)**: 11 models (`User`, `RoomMember`, `InviteLink`, `Workspace`, `Room`, `ContextZone`, `CanvasNode`, `CanvasEdge`, `TranscriptChunk`, `AIAction`, `RoomIntegration`, `MeetingReport`) with compound indexes.
- **1.2 Single-Source-of-Truth Persistence with Neon PostgreSQL (`server/src/lib/prisma.js` & `server/src/canvas/canvasPersistence.js`)**: Direct Neon PostgreSQL persistence via `@prisma/adapter-neon` WebSocket connection.
- **1.3 Unified API Response & Middleware (`server/src/utils/response.js` & `server/src/middlewares/error.middleware.js`)**: `sendSuccess` and `sendError` strictly adhering to `{ success, message, data }` format.
- **1.4 User Identity Abstraction & Database Seeding (`server/prisma/seed.js` & `auth.middleware.js`)**: `getCurrentUser(req)` returning demo identity (*Elena Vance*); seeded `demo-user-1`, `demo-user-2`, `default-workspace`, and `demo-room`.
- **1.5 Server Bootstrap (`server/server.js` & `server/src/app.js`)**: Express + HTTP server + Socket.io bootstrap with CORS, cookie-parser, and health check.

### Phase 2: Real-time Canvas Engine & Collaboration Relay (Complete & Verified)
*Goal: Build the interactive infinite canvas and WebSocket synchronization.*
- **2.1 `CanvasDocument` Single Source of Truth (`server/src/canvas/canvasDocument.js`)**: Authoritative in-memory state container managing nodes and edges for active rooms with schema validators. Enforces persist-then-commit ordering, 100ms debounced `MOVE_NODE` persistence queue, dual in-memory/DB edge cascade on `DELETE_NODE`, idempotent `CREATE_EDGE` upserts, and field whitelisting on `UPDATE_NODE`.
- **2.2 Socket.io Collaboration Relay (`server/src/realtime/socket.js` & `canvas.socket.js`)**: Room authorization enforcement via `socket.roomId`, consolidated `canvas:join` event delivering full state snapshot and peer broadcast.
- **2.3 Frontend Canvas Engine (`client/src/components/canvas/InfiniteCanvas.jsx` & `useCanvas.js`)**: Infinite hardware-accelerated 2D canvas with smooth pan, zoom, coordinate math, optimistic local updates, client-side UUID generation upfront, and ack-based rollback.
- **2.4 Rich Visual Node Components (`client/src/components/canvas/CanvasNode.jsx` & `CanvasEdge.jsx`)**: 8 specialized node cards (Goal, Idea, Task with checkbox, Decision, Question, Risk, Person, Generated Visual) and Cubic Bezier edge connectors with relationship tags and click-gating.

### Phase 3: AI Intelligence Engine & Confidence Routing (Complete & Verified)
*Goal: Build the multi-provider LLM abstraction, confidence routing, and in-place correction.*
- **3.1 Dual-Provider LLM Abstraction (`server/src/ai/providers/`)**:
  - `groq.js`: Primary provider (Llama 3.3 70B — free, ultra-fast ~300 t/s, structured JSON). Rate limits: 30 RPM, 12,000 TPM, 1,000 RPD (~2.75 hrs meetings/day).
  - `gemini.js`: Secondary fallback (Gemini 2.0 / 1.5 Flash — free, high reliability, 1M TPM). Rate limits: 15 RPM, 1,000,000 TPM, 1,500 RPD (~4.15 hrs meetings/day).
  - `index.js`: Fallback wrapper (`withFallback`) with seamless HTTP 429 failover. Combined free quota provides ~7 hours of active meetings/day for $0.00.
  - Context priming (phonetic auto-correction): injects room participant roster and active canvas entity keys into system prompt to automatically deduce and correct speech-to-text mishears (*"off flow"* → *"auth flow"*).
- **3.2 Confidence Routing Engine (`server/src/ai/validation.js`)**:
  - Implement `routeAction(action)`: `confidence >= 0.85` → `"auto"`, `0.5 <= confidence < 0.85` → `"proposed"`, `< 0.5` → `"clarify"`. Destructive actions (`DELETE_NODE`, `DELETE_EDGE`) are never auto-applied.
- **3.3 In-Place Correction via `semanticKey` (`server/src/canvas/canvasDeduplication.js`)**:
  - Match entities against active canvas nodes by stable `semanticKey`.
  - In-place update test: When user says *"Actually, Mike is busy, Sam will take the dashboard"*, update existing Task node's assignee in place rather than creating a duplicate.
- **3.4 Invariants & Edge Cases**:
  - *Deterministic UUID Assignment*: `validateAIAction()` assigns `crypto.randomUUID()` to all `CREATE_NODE` and `CREATE_EDGE` payloads upfront. Prevents validation rejection by `validateCanvasAction()` in `CanvasDocument` and ensures in-batch edge references resolve to true UUIDs instead of slugs.
  - *Token Headroom Guard (`max_tokens: 2500`)*: Raised from 1000 to prevent LLM response truncation on multi-entity extraction batches, eliminating silent `SyntaxError` throws on `JSON.parse()`.
  - *SyntaxError Transparent Failover*: `shouldFallback()` in `withFallback` catches truncated JSON / `SyntaxError` alongside HTTP 429/500, ensuring malformed LLM outputs fail over to Gemini Flash seamlessly rather than erroring out.
  - *Candidate Model Resilience*: `groq.js` loops through candidate models (`config.groqModel`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`) on HTTP 404, gracefully surviving per-organization model deprecations.
  - *Comprehensive Metadata Mutation Detection*: `deduplicateAndLinkActions()` checks all keys in `metadata` (not just `assignee` and `text`), ensuring task status changes (`"mark as done"`) and priority shifts generate in-place `UPDATE_NODE` actions.
  - *Multi-Key Round-Robin Pooling*: `GROQ_API_KEYS=key1,key2` automatically rotates between pooled keys, doubling the free tier ceiling to 2,000 requests/day.

### Phase 4: The Active Command Bar & AI Activity Stream
*Goal: Build the headline conversational control bar, shared effector bridge, and "Why this exists" evidence system.*
- **4.0 AI Action Effector & Activity Stream Persistence Bridge (`server/src/ai/applyAIActions.js` & `server/src/utils/hash.js`)**: Deterministic SHA-256 fingerprinting with normalized sorted JSON payloads enforcing `@unique` on `AIAction.fingerprint`; authoritative status routing (`"auto"` applies to `CanvasDocument` and broadcasts `canvas:action` + `ai:activity`; `"proposed"` persists and emits `ai:proposed`); lifecycle resolution (`approveAIAction`, `rejectAIAction`).
- **4.1 Active Command Bar UI (`client/src/components/command/ActiveCommandBar.jsx`)**: Permanent floating input (`✨ Ask your workspace...`) with rotating prompt pills.
- **4.2 Action Vocabulary Expansion (`server/src/ai/commands.js` & `canvasLayout.js`)**: `REORGANIZE_LAYOUT` (hierarchical roadmap, cluster by theme, move risks) and `ANSWER_QUERY` (read-only node highlighting & recap).
- **4.3 AI Activity Stream (`client/src/components/activity/ActivityStream.jsx`)**: Live feed of chronological AI actions with timestamps, confidence badges, and status.
- **4.4 "Why This Exists" Evidence Card (`client/src/components/activity/EvidenceCard.jsx`)**: Inspection card showing transcript quote, speaker, timestamp, and AI reasoning.

### Phase 5: Stepped Transcript Simulator, Passive Extraction & Real Custom Auth
*Goal: Deterministic meeting simulator, continuous conversation-to-canvas extraction, and session auth.*
- **5.1 Stepped Transcript Playback Simulator (`client/src/components/meeting/SpeechIntelligenceController.jsx`)**: Pre-loaded transcript scenarios with stepped/continuous playback for testing.
- **5.2 Passive Streaming Extraction (`server/src/ai/extraction.js` & `ai.service.js`)**:
  - Speaker attribution pipeline: Structured dialogue script `[Timestamp] Speaker: Utterance`.
  - Adaptive triggering with single-flight lock & 3.5s cooldown: Hard-caps frequency to $\le 17\text{ RPM}$, eliminating out-of-order race conditions and guaranteeing rate limit compliance.
  - Conversational filler filter: Discards chunks under 4 words of fluff (*"yeah"*, *"uh-huh"*), saving 30–40% API quota.
- **5.3 Canonical Test Paragraph Verification**: Validate multi-node + dependency graph extraction against *"We need to improve onboarding. Mike will redesign the dashboard, but analytics needs to be ready first."*
- **5.4 Real Custom Authentication (`server/src/routes/auth.routes.js` & `client/src/context/AuthContext.jsx`)**: bcrypt password hashing, JWT in httpOnly cookie, Socket.io handshake auth (`io.use`), room membership (`RoomMember`), dynamic room verification via `getOrCreateRoom` on `canvas:join`.

### Phase 6: Presence, Minimap & Meeting Modes (Complete & Verified)
*Goal: Implement multiplayer live presence and adaptive meeting formats.*
- **6.1 Multiplayer Live Cursors (`client/src/components/canvas/MultiplayerCursors.jsx`)**: Emitted strictly in canvas-space `(x, y)` coordinates; 35ms client throttle reduces network traffic by ~60%, rendered with 60fps CSS transitions (`transform 40ms linear`) and 5s idle fade-out.
- **6.2 Radar Minimap with Viewports (`client/src/components/canvas/Minimap.jsx`)**: Fixed bottom-right radar thumbnail with 0-node fallback (`width: 2000, height: 1500`) and 1-node padding floor (`±600px` horiz, `±400px` vert). Dynamic `ResizeObserver` / window resize tracking with fresh rect queries preventing stale viewport jump anchors; interactive click-and-drag navigation with absolute user input precedence.
- **6.3 "Follow Me" Presenter Broadcast (`server/src/realtime/presence.socket.js` & `PresenterFollowBanner.jsx`)**: Atomic single-presenter lock rejecting competing claims with `PRESENTER_BUSY` (surfaced as inline amber badge). 30ms rate ceiling with defensive trailing-edge flush timer. Opt-in follow model (followers consent without camera yanking). Normalized `{ socketId, presenterId, user, startedAt }` schema. Single-source-of-truth disconnect pipeline in `presence.service.js`.
- **6.4 Adaptive Meeting Modes & Steerability (`Room.mode`)**: Mode switching between `operational` (structured topic execution) and `brainstorm` (freeform ideation & generative visuals) via `PATCH /api/rooms/:roomId/mode` with Socket.io broadcast.
- **6.5 Contextual Zones (`ContextZone`)**: Authoritative database models and REST endpoints (`GET`, `POST`, `DELETE /api/rooms/:roomId/zones`) with scoped room checks for safe deletion.

### Phase 7: Generative Visuals, Commit Flow & External Integrations
*Goal: Connect canvas brainstorms to Pollinations.ai and package meetings for Notion, Slack, and Resend.*
- **7.1 Pollinations.ai Generative Visuals (`server/src/integrations/imageGen.js`)**: Free, zero-key image generation via `https://image.pollinations.ai/prompt/{encodedPrompt}` attached to brainstorm nodes.
- **7.2 Meeting Commit Flow (`server/src/services/ai.service.js` & `CommitCallModal.jsx`)**: "Commit Call" button triggering `ai.summarizeMeeting()` with summary, decisions log, tasks, and celebratory confetti.
- **7.3 External Integrations (`server/src/integrations/`)**: Slack incoming webhook (Block Kit), Notion database page creation, and transactional HTML email via Resend API (+ markdown download).

### Phase 8: Voice Dictation, Video Bar, Dagre Layout, & Demo Script Dry Run
*Goal: Integrate voice dictation, video communication bar, auto-layout, and demo script validation.*
- **8.1 Dual-Tier Speech-to-Text Audio Engine (`client/src/hooks/useSpeechRecognition.js` & `server/src/ai/transcription.js`)**: Web Speech API for zero-latency local captions; Groq Whisper Large v3 Turbo (`whisper-large-v3-turbo`, 7,200 audio sec/hr free) for technical jargon and accents.
- **8.2 Video Conference Bar (`client/src/components/meeting/VideoConferenceBar.jsx`)**: Dockable bottom bar with webcam tiles, mic/camera toggles, and live captions.
- **8.3 Dagre Hierarchical Auto-Layout Engine (`client/src/utils/layout.js`)**: Automated algorithm arranging nodes into clean hierarchical trees.
- **8.4 Skeleton Loaders, Mobile Responsiveness & Polish**: Dark-mode glassmorphic aesthetics, skeleton loaders for AI thinking states (no raw spinners), mobile-first responsive viewports.
- **8.5 End-to-End Demo Script Dry Run**: Validate the 13-point master demo script (*"We don't take notes for you. We think with you."*).

---

## 14. Demo script

Centerpiece line: *"We don't take notes for you. We think with you."*

1. Open on the full room view already assembled — participants, empty canvas, mode
   indicator set to Operational, the Active Command Bar visible at the bottom.
2. "This is a blank workspace, let's start a meeting."
3. "We need to improve onboarding." → Goal node appears.
4. "Mike can handle the dashboard redesign." → Task node appears, tagged Mike.
5. "But we need analytics before we start." → Analytics node appears, `blocks` edge to
   the task.
6. Type into the command bar: "Turn this into a roadmap and flag anything we're
   uncertain about." → canvas reorganizes, a Question node appears.
7. **Correct the AI live** — say something that contradicts an earlier extraction (e.g.
   "actually, Mike is busy, Sam will take the dashboard") and show the node update in
   place rather than duplicate. This is the beat that proves adaptability, not just
   extraction.
8. Click a node → show the "why this exists" evidence card → transcript source.
9. Type "show me all dependencies" → dependency edges highlight.
10. Switch mode to Brainstorm live, say an idea out loud → a generated visual appears.
11. Click "follow me" — second browser's camera snaps to match; show the minimap with
    both cursors visible.
12. Click Commit — show the report land in Slack/Notion and an email arrive.
13. If video made it into the build: turn it on here, as a closing flourish, not a
    load-bearing part of the story.

That sequence demonstrates the full arc — talk, AI understands, canvas changes, user
corrects the AI, AI adapts, team sees it, commit — without ever feeling like a feature
checklist.

---

## 15. Naming — locked

**mindMesh** — tagline: *"the conversation becomes the canvas."*

One light flag, not a blocker: **MindMeister** is an existing mind-mapping tool in an
adjacent category, so expect some visual/verbal similarity in casual conversation
("mindMesh... like MindMeister?"). Distinct enough to keep — just be ready for that
comparison to come up, and let the product demo be the answer to it.

---

## 16. Risks to watch for (solo build, full scope)

- **Scope creep is now the primary risk**, not architecture. Phase 1 & Phase 2 must be
  solid and verified before advancing to subsequent phases — resist building modes or
  integrations against a shaky core loop.
- **Rate limits mid-demo**: batch transcript chunks, keep the fallback provider tested,
  cap fallback attempts at 1.
- **Duplicate node spam**: the context manager (§8) and semanticKey reuse are what
  prevent this.
- **Canvas clutter**: lean on medium/low confidence tiers, don't auto-apply everything.
- **Integration fragility**: Slack/Notion/email are each one more thing that can fail
  live during a demo — wrap each in its own try/catch so a failed Slack post doesn't
  block the email or the Notion page.
- **Image generation latency/quality**: Pollinations is free but not fast or
  high-fidelity — set expectations accordingly, and don't block the passive extraction
  loop waiting on an image request.
- **AI outputting positions**: if you catch yourself parsing x/y out of a model
  response, the prompt or action schema has drifted — go back to §6.