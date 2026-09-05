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
| Frontend | React + Tailwind + React Flow | canvas for structured modes |
| Live collaborative state | **Socket.io broadcast + React state** | server relays CREATE/UPDATE/DELETE/MOVE events, no CRDT — see §10 for why this is enough for now; add Yjs later only if you have spare time |
| Durable state | Neon Postgres + Prisma | |
| Application events | Socket.io (same connection) | canvas events + presence (cursors/minimap/follow-me) + app events |
| Video | LiveKit | optional scope — add last, only once everything else works; canvas + AI is the demo, video isn't what's being judged |
| Speech-to-text | Web Speech API → optional Groq Whisper upgrade | |
| AI — primary | Groq (Llama 3.3 70B) | free, fastest, no card |
| AI — fallback | Gemini 2.5/3 Flash | free, stronger structured output, no card |
| Generative visuals (brainstorm mode) | **Pollinations.ai** (`image.pollinations.ai/prompt/{text}`) | completely free, zero API key, single GET request — right fit for a no-budget MVP; swap to a paid provider later if quality demands it |
| Slack integration | Incoming Webhooks | free, no OAuth needed for posting a commit summary; upgrade to full OAuth + Web API later if you need to read channels |
| Notion integration | Notion API (free integration token) | user supplies a database ID + token in room settings; backend creates a page per commit |
| Email report | **Resend** (free tier, no card, generous monthly quota) | simplest transactional email API for a Node backend |
| Auth | **Custom** (bcrypt + JWT in httpOnly cookies) | see §5 — full design below, no third-party auth provider |

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
but implementation is deliberately **not** the first thing you build — see §13, Phase 0
step 8. Prove the AI → canvas loop with a temporary demo user first; add this once the
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
demo — don't let them delay Phase 0.

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

Build this right after your first working AI command (see build order, §12) — it's
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

## 13. Build order

De-risk by proving the AI → canvas loop — the actual differentiator — before auth,
integrations, or video. Sequence still matters solo, even building everything.

**Phase 0 — Core loop (prove the product, not the plumbing)**
1. Canvas with a temporary demo user: React + React Flow + Express + Prisma + Neon,
   create/edit/delete/connect, persist, reload. Hardcode a single demo `userId` for now
   — but wrap "who is the current user" behind one `getCurrentUser(req)` function from
   the start, so swapping in real auth later (step 8) is a one-line change, not a
   scattered refactor.
2. Collaboration: plain Socket.io broadcast + React state (§10). Two tabs, two demo
   identities, see the same drag live — no Yjs yet.
3. AI commands, text-only, single action: one typed sentence → validated `CREATE_NODE`
   → canvas updates. Proves the whole pipeline (provider abstraction, validation,
   ontology prompt) before anything else.
4. AI Activity stream + evidence (§9) — build this immediately after step 3, it's cheap
   here and pays for itself as a debugging tool for everything that follows.
5. **Active Command Bar, full vocabulary** (§12) — this is the #1 feature, prove it
   before passive extraction: `REORGANIZE_LAYOUT` ("turn this into a roadmap," "group
   these ideas," "move risks to the right") and `ANSWER_QUERY` ("what are we missing,"
   "show dependencies," "what did we decide"). This is the differentiator a judge
   remembers — give it real build time here, not a rushed pass later.
6. Conversation: chat → transcript → passive multi-node extraction, proven against the
   canonical test paragraph in §8.
7. Canvas polish pass: node-creation animations, hover states, clean typography and
   spacing, smooth pan/zoom. Do this now, not deferred to Phase 5 — visual quality is
   competing directly with feature count for attention, and it's cheap to get right
   while the canvas is still simple.
8. Real auth: signup/login/logout, session cookie, `requireAuth`/`requireRoomAccess`
   middleware, room creation seeding an `owner`. Swap `getCurrentUser(req)` from the
   step-1 stub to a real session lookup — everything built above keeps working
   unchanged if step 1's abstraction was honored.

**Phase 1 — Presence & modes**
9. Cursors, minimap, follow-me (§10).
10. Mode switching (`Room.mode`) and mode-aware prompting (§8) — start with operational
    and brainstorm; solo can reuse either.
11. Contextual zones (§10).

**Phase 2 — Generative visuals**
12. Brainstorm mode's image generation via Pollinations — attach as node metadata,
    render as image nodes on canvas.

**Phase 3 — Commit & integrations**
13. Commit flow: summary generation + `MeetingReport` + email via Resend.
14. Slack webhook integration.
15. Notion integration.

**Phase 4 — Voice & video (video is optional, not a milestone to protect)**
16. Web Speech API (mic → transcript → canvas).
17. LiveKit video, only once everything above works — treat it as optional scope, not
    a required milestone. If time runs out before this step, the product still stands
    on its own: canvas + AI is the demo, video is not what's being judged.

**Phase 5 — Further polish**
18. Auto-layout upgrade (dagre), meeting timeline, landing page, room invite links,
    keyboard shortcuts, pre-meeting document upload for operational mode's topic
    outline.

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

- **Scope creep is now the primary risk**, not architecture. Phase 0 must be solid
  before Phase 1 starts — resist building modes or integrations against a shaky core
  loop.
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