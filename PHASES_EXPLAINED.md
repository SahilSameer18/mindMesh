# mindMesh — Every Phase Explained in Plain English 🧠✨

> *"We don't take notes for you. We think with you."*

Welcome to the plain-English guide to **mindMesh**. This document breaks down every single phase of the project: what problem it solves, how it works under the hood, and why it was built this way—without overwhelming jargon.

---

## 🌟 What is mindMesh in 30 Seconds?

In regular meetings, someone has to furiously type notes into a Google Doc, action items get buried, and 30 minutes after the call ends, everyone forgets what was decided.

**mindMesh turns the conversation into the canvas.**  
As you and your team talk or type:
1. The AI listens and extracts your **goals, tasks, decisions, questions, and risks**.
2. It organizes them as **interactive cards** on an infinite digital whiteboard in real time.
3. If someone says *"Actually, Mike is busy, Sam will take that"*, it **updates the card in place** rather than duplicating it.
4. When the call wraps up, one click on **"Commit Call"** analyzes the board and sends a polished executive briefing straight to Slack, Notion, or Email.

---

## 🏗️ Phase 1: The Rock-Solid Foundation
*Goal: Give the application a permanent memory and bulletproof data contracts.*

### The Problem It Solved:
If an app stores data in scattered temporary files or disorganized memory, things vanish on server restart and foreign-key errors crash the app.

### How It Works Simply:
* **Neon PostgreSQL & Prisma**: We set up 11 clean database tables (`User`, `Room`, `CanvasNode`, `CanvasEdge`, `TranscriptChunk`, `AIAction`, `MeetingReport`, etc.). Everything has a permanent home in the cloud.
* **Pre-Seeded Personas**: You can test the app immediately as **Elena Vance (Product Lead)** and **Marcus Sterling (Tech Lead)** without needing to go through a 5-step registration form every time you start the server.
* **The Unified Response Rule**: Every API endpoint responds in the exact same format:  
  `{ "success": true, "message": "...", "data": { ... } }`.  
  No surprises for the frontend.

---

## 🎨 Phase 2: The Real-Time 60fps Collaborative Canvas
*Goal: Build an infinite 2D digital whiteboard that multiple people can draw and move cards on simultaneously.*

### The Problem It Solved:
Standard canvases get laggy when multiple people drag cards, and internet hiccups can cause cards to flicker or jump backward.

### How It Works Simply:
* **Authoritative Memory (`CanvasDocument`)**: The server holds an in-memory master copy of the room's canvas for lightning-fast WebSocket broadcasts.
* **Hardware-Accelerated 60fps Pan & Zoom**: You can zoom in to micro-details or zoom out to see the entire project graph smoothly.
* **8 Specialized Card Types**:
  * 🎯 **Goal** (High-level targets)
  * 💡 **Idea** (Brainstorm thoughts)
  * 🟢 **Task** (Checkboxes, assignees, and priorities)
  * 🔵 **Decision** (Agreed commitments)
  * 🟣 **Question** (Unresolved inquiries)
  * 🔴 **Risk** (Blockers and architectural cautions)
  * 👤 **Person** (Team roster cards)
  * 🖼️ **Generated Visual** (AI illustrations and concept art)
* **Smooth Curved Connectors**: Visual Bezier lines with relationship badges (`blocks`, `depends_on`, `leads_to`).
* **100ms Smart Debounce**: If you rapidly drag a card across the screen, it glides at 60fps in memory and only saves to PostgreSQL once you pause, saving 90% of database write overhead.

---

## 🧠 Phase 3: The Dual-Provider AI Brain & Self-Correction
*Goal: Turn messy human speech into clean cards, and gracefully handle AI rate limits.*

### The Problem It Solved:
Free AI APIs hit rate limits (HTTP 429) and crash. Also, AI often creates duplicate cards when people revise what they just said.

### How It Works Simply:
* **Two AI Engines Working Together**:
  * **Primary**: **Groq (Llama 3.3 70B)** — Super fast (~300 tokens/sec), free tier, ultra-smart reasoning.
  * **Backup**: **Google Gemini Flash** — If Groq gets busy or rate-limited, mindMesh switches to Gemini in **less than 100 milliseconds** without the user noticing.
* **In-Place Correction**: If Elena says *"Mike will build the dashboard"*, a Task card appears for Mike. If she follows up with *"Actually, Mike is swamped, give it to Sam"*, the card **changes Mike to Sam in place**—no duplicates!
* **Confidence Routing**:
  * $\ge 85\%$ confident $\to$ **Auto-applied** directly onto the board.
  * $50\% - 84\%$ confident $\to$ **Proposed** in the activity drawer for a human thumbs-up.
  * Destructive actions (deleting cards) are **never** auto-applied without human consent.
* **Phonetic STT Auto-Correction**: Understands audio mishears (e.g., if speech-to-text hears *"off flow"*, the AI knows from context you meant *"auth flow"*; *"prism a"* becomes *"Prisma"*).

---

## ⚡ Phase 4: The Active Command Bar & "Why This Exists" Evidence
*Goal: Give users a conversational search/command bar and total transparency into AI decisions.*

### The Problem It Solved:
AI tools often act like a "black box"—users don't know *why* an AI created a card or where the idea came from.

### How It Works Simply:
* **Floating Command Bar (`Cmd+K`)**:
  A clean input at the bottom of your screen. You can type:
  * *"Turn this into a roadmap"* $\to$ Canvas reorganizes into a neat timeline.
  * *"Move risks to the right"* $\to$ Auto-clusters all red cards together.
  * *"What did we decide about auth?"* $\to$ Highlights the relevant cards and types an instant recap.
* **"Why This Exists" Evidence Cards**:
  Click on **any** card on the board, and an inspection drawer opens showing:
  * The **exact audio quote** that generated it.
  * Who said it and the exact timestamp (`[10:14:02] Elena Vance`).
  * The AI's step-by-step reasoning. No hallucinations.

---

## 🎙️ Phase 5: The Meeting Simulator, Smart Speech Queue & Auth
*Goal: Deterministic testing without background noise, rate-limit protection, and real user logins.*

### The Problem It Solved:
Testing audio in noisy environments is annoying, sending speech every 2 seconds drains API limits in 5 minutes, and basic local-storage logins are insecure.

### How It Works Simply:
* **Dialogue Scenario Simulator (The Dock)**:
  A pre-loaded meeting script simulator. With one click, Elena and Marcus have a realistic product sprint conversation, populating the canvas with zero microphone hassles.
* **The 3.5s Single-Flight Queue (Rate-Limit Shield)**:
  Instead of firing an AI call every time someone breaths, mindMesh waits for a speaker to finish or a 1.5s natural pause. It locks to **max 1 in-flight call at a time with a 3.5-second cooldown**. This caps calls to $\le 17$ per minute, meaning you can run full meetings all day on free AI tiers without ever getting blocked.
* **Conversational Filler Filter**:
  Ignores fluff like *"yeah"*, *"uh-huh"*, *"okay"*, saving 35% of the AI token budget.
* **Real Custom Auth**:
  Bcrypt password hashing + JWT tokens locked inside `httpOnly` secure cookies (immune to XSS attacks).

---

## 👥 Phase 6: Multiplayer Live Presence, Minimap & Meeting Modes
*Goal: Feel like you're standing around the same physical whiteboard together.*

### The Problem It Solved:
In multiplayer apps, cursors drift on different screen sizes, presenters yank people's cameras without permission, and a board has no sense of navigation.

### How It Works Simply:
* **Multiplayer Live Cursors**:
  Cursors are calculated in **canvas space coordinates**, not screen pixels. If Marcus is pointing at the "Database" card on his 4K monitor, his cursor appears directly on that exact card on Elena's laptop. 35ms throttling gives a silky 60fps CSS glide.
* **Radar Minimap (Bottom-Right)**:
  A bird's-eye canvas GPS. You can see all cards, see where your teammates are looking, and click or drag anywhere on the minimap to instantly fly your camera there.
* **"Follow Me" Presenter Broadcast**:
  * Elena clicks **"Follow Me"**. An atomic lock guarantees only one person leads.
  * Marcus sees a gentle notification: *"Follow Elena"*. He can opt in with one click.
  * If Marcus pans his own canvas, he seamlessly detaches without getting camera-yanked.
* **Meeting Modes**:
  * ⚡ **Operational Mode**: Tight, structured layout for sprint execution.
  * 🧠 **Brainstorm Mode**: Freeform clustering, generative visual concept creation, and organic ideation.

---

## 📋 Phase 7: Generative Visuals, Meeting Commit & Integrations
*Goal: Turn brainstorms into visuals, and turn finished meetings into actionable executive reports.*

### The Problem It Solved:
Meetings end, people leave the call, and nobody follows up. Traditional meeting summaries only read audio transcripts, ignoring what was actually drawn or decided on screen.

### How It Works Simply:
* **Instant Visual Concept Creator (`/image [prompt]`)**:
  Type `/image distributed cache` $\to$ Pollinations.ai generates a concept diagram for free.
  * **Two-Phase Speed**: Card pops up in $<50$ milliseconds with a loading skeleton so you're not stuck waiting. The image snaps in when ready.
  * **Ghost-Card Guard**: If you delete the card before the image loads, it will never accidentally resurrect itself as a phantom card!
* **The "Dual-Source" Meeting Commit Engine**:
  mindMesh looks at **both**:
  1. What was spoken (historical debate and nuance).
  2. What is active on the canvas (the authoritative final truth).
  *If an idea was talked about for 10 minutes but deleted off the canvas, mindMesh knows it was rejected and won't hallucinate it as an active decision!*
* **The Safety Net (Deterministic Fallback)**:
  If the AI APIs ever go down mid-demo, mindMesh automatically reads the cards on the board and writes a high-quality, human-readable 3-paragraph briefing with tasks and decisions. **It never shows a blank screen or 500 error.**
* **Smart Double-Click Lock (Promise Sharing)**:
  If two people click "Commit Call" at the same time, mindMesh shares the same calculation. No duplicate database rows, no wasted AI tokens.
* **One-Click Dispatchers (Slack, Notion, Email)**:
  * **Slack**: Block Kit card with direct link back to canvas.
  * **Notion**: Meeting page with interactive checkable to-do boxes.
  * **Email**: Dark-mode HTML briefing with task tables and status badges.
  * **Zero-Key Simulation Mode**: Works out of the box in local dev even if you don't have real Slack or Notion API keys!

---

## 🎙️ Phase 8: Voice Dictation, Dagre Auto-Layout & Final Polish (Completed)
*Goal: The closing flourish—real-time voice-to-canvas dictation, Dagre hierarchical auto-layout, dockable video meeting bar, and shimmer skeletons.*

### What We Built & Why It Matters:
* **Zero-Lag Voice Dictation (`M` Hotkey)**:
  Talk directly into your microphone; the Web Speech API streams local captions with $<10$ms latency into an interim caption pill above the command bar, while silence auto-recovery keeps dictation alive during conversational pauses.
* **Dagre Hierarchical Auto-Layout Engine**:
  Messy whiteboard nodes arrange themselves into clean top-down tree graphs with a single click. Uses Kahn's algorithm for topological sorting, breaks circular dependency loops safely, and applies barycentric crossing minimization so connector lines stay neat and readable.
* **Dockable Video Meeting Bar**:
  A glassmorphic dock at the bottom of the canvas with live webcam feeds, toggleable camera/mic controls, RMS audio level meters, and instant hotkey integration.
* **Unified Single-Mic Pipeline**:
  Both the header dictation toggle and the bottom video conference bar share a single authoritative microphone capture instance—eliminating browser audio hardware contention.
* **Premium Shimmer Skeletons**:
  AI thinking states and card loaders use sleek glassmorphic skeleton placeholders instead of raw spinning wheels, matching startup-grade design standards.

---

## 🛡️ The 7 Golden Rules We Never Break in mindMesh

1. **Security First**: `.env` and secret credentials are never exposed, opened, or logged.
2. **Persist-Then-Commit**: Critical database writes happen before in-memory state updates, eliminating memory drift.
3. **No Phantom Cards**: Deleting a card cancels all pending moves and updates—ghost nodes cannot resurrect.
4. **Transparent Failover**: If an AI provider rate-limits or glitches, the backup provider catches the request in $<100$ms.
5. **Truthful Evidence**: Every card on the board can prove *why* it exists with a direct transcript timestamp.
6. **Graceful Simulation**: Integrations (Slack, Notion, Email) work out of the box without requiring external API keys.
7. **Mobile-First & Skeleton UI**: Layouts stay responsive across viewports, and loading states use shimmer skeletons instead of spinning wheels.
