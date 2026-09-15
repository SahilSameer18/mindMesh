# 🧪 mindMesh — Complete End-to-End Feature Verification Guide

This guide gives you step-by-step instructions to test **every single feature, interaction, and capability** in mindMesh. 

Follow along in order, check off the boxes as you test, and verify both what you see on the screen and what happens behind the scenes.

---

## 📋 Table of Contents
1. [Pre-Flight Health Check](#1-pre-flight-health-check)
2. [Landing Page & Workspace Launcher](#2-landing-page--workspace-launcher)
3. [User Authentication & Session Security](#3-user-authentication--session-security)
4. [Infinite Spatial Canvas Engine](#4-infinite-spatial-canvas-engine)
5. [Multiplayer Real-Time Collaboration (2-Window Test)](#5-multiplayer-real-time-collaboration-2-window-test)
6. [Live Voice Dictation (Microphone & Hotkeys)](#6-live-voice-dictation-microphone--hotkeys)
7. [AI Speech Intelligence & Benchmark Scenarios](#7-ai-speech-intelligence--benchmark-scenarios)
8. [Manual Canvas Creation & Active Command Bar](#8-manual-canvas-creation--active-command-bar)
9. ["Why This Exists" Evidence Card Modal](#9-why-this-exists-evidence-card-modal)
10. [Guest Invite Links & Incognito Joining](#10-guest-invite-links--incognito-joining)
11. [End-of-Meeting "Commit Call" & Synthesis Report](#11-end-of-meeting-commit-call--synthesis-report)
12. [Dashboard, Workspace Management & 404 Error Handling](#12-dashboard-workspace-management--404-error-handling)

---

## 1. Pre-Flight Health Check

Before testing the frontend UI, verify that your backend and database are answering:

- [ ] **Check Backend Health:**
  - Open a new browser tab and visit: `https://your-backend.onrender.com/api/health`
  - **Expected Result:** A JSON response indicating status `healthy` with server uptime:
    ```json
    {
      "success": true,
      "message": "mindMesh backend is operational",
      "data": {
        "status": "healthy",
        "uptime": 123.45,
        "environment": "production"
      }
    }
    ```

---

## 2. Landing Page & Workspace Launcher

- [ ] **2.1. Hero Section & Visual Polish:**
  - Visit your Vercel URL: `https://your-app.vercel.app`
  - **Look for:** 
    - Ambient background glows (`indigo`, `violet`, `sky`).
    - The animated top pill badge: `"Real-Time Dialogue to Living Knowledge Graph"`.
    - Main title: `"Meetings that map themselves"`.
    - Live visual preview card showing simulated dialogue and mock Goal, Task, and Risk cards.
- [ ] **2.2. Interactive Sandbox ("Explore Live Demo"):**
  - Click the **"Explore Live Demo"** button on the hero section.
  - **Expected Result:** You immediately transition into `/room/demo-room` with pre-populated nodes, active audio simulation controls, and zero authentication blocks.
  - Click the top-left **mindMesh** logo to return back to Home.
- [ ] **2.3. Create Workspace Modal:**
  - Click **"Start Free Workspace"** on the hero.
  - A modal should pop up with:
    - A randomly generated workspace slug (e.g., `aurora-sprint`, `matrix-sync`).
    - A dice icon button to re-roll random room names. Click it 3 times to see it generate new names.
    - An optional "System Context / Goal" textarea.
  - Type a custom room name: `test-sprint-alpha`.
  - Click **"Launch Workspace"**.
  - **Expected Result:** You are navigated to `/room/test-sprint-alpha` with a clean, initialized infinite canvas.

---

## 3. User Authentication & Session Security

- [ ] **3.1. Register a New Account:**
  - On the top navigation bar, click **"Register"** (or visit `/register`).
  - Enter:
    - **Name:** `Elena Vance`
    - **Email:** `elena@test.com`
    - **Password:** `password123`
  - Click **"Create Account"**.
  - **Expected Result:** You are automatically logged in and redirected to `/dashboard`. A toast notification confirms registration.
- [ ] **3.2. Session Persistence Test:**
  - While logged in, refresh your browser page (`F5` or `Ctrl+R`).
  - **Expected Result:** You remain logged in. Your name and user avatar appear in the top-right navbar without kicking you to `/login`.
- [ ] **3.3. Logout & Re-Login:**
  - Click your user profile avatar in the navbar → click **"Log Out"**.
  - **Expected Result:** Session is cleared; navbar returns to showing "Login" and "Register".
  - Click **"Login"**, enter `elena@test.com` and `password123`, then submit.
  - **Expected Result:** Successfully logged back into your account.

---

## 4. Infinite Spatial Canvas Engine

Navigate into any active workspace (e.g., `/room/test-canvas`):

- [ ] **4.1. Spatial Grid & Aesthetics:**
  - Verify the dotted graph-paper background pattern (`canvas-grid`).
  - Notice the smooth, high-contrast typography and Linear/Arc-inspired design.
- [ ] **4.2. Panning (Navigation):**
  - **Click and drag** on empty canvas space with your mouse.
  - **Expected Result:** The whole canvas smoothly pans across the 2D plane with zero jitter.
- [ ] **4.3. Zooming (Scaling):**
  - Use your mouse scroll wheel (or pinch on trackpad) to zoom in and out.
  - **Expected Result:** Canvas zooms smoothly between 20% and 300%. The zoom indicator pill at the bottom updates in real time.
- [ ] **4.4. Viewport Reset:**
  - Pan far away into empty space.
  - Click the **"Reset View"** (or `100%`) button in the bottom floating toolbar.
  - **Expected Result:** The camera smoothly animates back to center `(0, 0)` at `100%` zoom.

---

## 5. Multiplayer Real-Time Collaboration (2-Window Test)

*This is the definitive test of the WebSocket server and multi-user sync.*

- [ ] **5.1. Open Two Side-by-Side Windows:**
  - **Window A (Left):** Keep your regular browser open to `/room/sync-test` (Logged in as Elena).
  - **Window B (Right):** Open an **Incognito / Private Window** to the exact same URL: `/room/sync-test`.
- [ ] **5.2. Live Presence Bar:**
  - Look at the top right of the workspace header in both windows.
  - **Expected Result:** Both windows show multiple avatar circles showing active collaborators in the room.
- [ ] **5.3. Live Cursor Tracking:**
  - Move your mouse inside **Window A**.
  - Watch **Window B**.
  - **Expected Result:** You will see Elena's colored cursor moving across Window B in real time with her name tag attached, matching 60fps movement.
- [ ] **5.4. Card Drag Sync:**
  - In Window A, click and drag any card on the canvas to a new position.
  - **Expected Result:** The card moves simultaneously in Window B in real time without refreshing.

---

## 6. Live Voice Dictation (Microphone & Hotkeys)

*Note: The Web Speech API works natively in Chrome, Edge, and Chromium-based browsers.*

- [ ] **6.1. Toggle Microphone via Button:**
  - In the top workspace header, locate the **Microphone** button.
  - Click the **Microphone** button.
  - Grant browser microphone permission if prompted.
  - **Expected Result:** 
    - The button turns glowing green/indigo with an active pulse indicator.
    - The status badge shows `"Listening"`.
- [ ] **6.2. Hotkey Toggle (`M`):**
  - Press the letter **`M`** on your keyboard (while not typing in an input box).
  - **Expected Result:** The microphone instantly toggles between active and muted.
- [ ] **6.3. Live Interim Caption Floating Pill:**
  - While the mic is green, speak clearly into your computer:
    > *"We need to redesign developer onboarding by next Friday."*
  - **Expected Result:** A floating glassmorphic pill appears at the bottom center of the screen with a pulsing emerald beacon, displaying your live words as you speak them in real time.

---

## 7. AI Speech Intelligence & Benchmark Scenarios

Even if you do not want to talk out loud, you can test the entire AI extraction engine using the built-in scenario simulator:

- [ ] **7.1. Open Speech Intelligence Controller:**
  - Click the **"Speech Intelligence"** (or Radio/Waveform) button in the bottom-left controls.
  - A bottom console modal slides up showing:
    - Live Captions tab.
    - Benchmark Scenarios (1 through 4).
- [ ] **7.2. Run Scenario 1 ("Canonical Onboarding Debate"):**
  - Select Scenario 1: Elena and Marcus debate onboarding dependencies.
  - Click **"Play Sequence"** (or click **"Step Next"**).
  - Watch the transcript ticker emit chunks:
    1. Elena: *"We need to improve onboarding."*
    2. Marcus: *"Mike will redesign the dashboard, but analytics needs to be ready first."*
  - **Expected Result:**
    - The server coalesces the dialogue.
    - Within 2–4 seconds, **new cards spawn automatically on the canvas!**
    - An Amber **Goal Card** appears: *"Improve onboarding"*.
    - An Emerald **Task Card** appears: *"Redesign dashboard (Assigned: Mike)"*.
    - A Rose **Risk Card** appears: *"Analytics readiness dependency"*.
    - Dependency lines link the cards together on the spatial canvas.
- [ ] **7.3. Run Scenario 4 ("Fluff Filter"):**
  - Switch to Scenario 4.
  - Click Step Next on conversational filler: *"Yeah, uh-huh, okay cool."*
  - **Expected Result:** The fluff filter drops the filler; no duplicate or garbage cards are created on the canvas, conserving your AI tokens.

---

## 8. Manual Canvas Creation & Active Command Bar

- [ ] **8.1. Floating Active Command Bar:**
  - Locate the floating horizontal pill bar near the bottom of the canvas.
- [ ] **8.2. Create a Manual Goal Card:**
  - Click the **+ Goal** button (Amber icon).
  - Enter a title: *"Launch Public Beta v1.0"*.
  - **Expected Result:** A glowing amber Goal node is added to the canvas at your current viewport center.
- [ ] **8.3. Create a Manual Task Card:**
  - Click **+ Task** (Emerald icon).
  - Enter: *"Configure Stripe Billing"*.
  - Assignee: Select or type your name.
  - **Expected Result:** A task node spawns with an interactive checkbox and status tag.
- [ ] **8.4. Move and Arrange Nodes:**
  - Click and drag the new cards around the canvas.
  - Notice that spatial coordinates update smoothly without snapping or jitter.

---

## 9. "Why This Exists" Evidence Card Modal

Every AI-generated card in mindMesh has full provenance (it remembers the exact spoken words that created it):

- [ ] **9.1. Inspect an AI Node:**
  - Click on any Goal, Task, or Risk card that was generated from speech.
  - Click the **Inspect / Info** icon (or click the card title).
- [ ] **9.2. Verify Evidence Modal:**
  - **Expected Result:** A glassmorphic modal opens showing:
    - **Node Title & Type:** (e.g. Goal / Milestone).
    - **Exact Attributed Quote:** The verbatim sentence that triggered the card.
    - **Speaker Attribution:** Who said it (e.g. Elena Vance).
    - **Timestamp:** The exact time the utterance was spoken.
    - **Confidence Meter:** The AI's extraction confidence score.
  - Click **"Pan to Node"** or the close `✕` button to dismiss.

---

## 10. Guest Invite Links & Incognito Joining

- [ ] **10.1. Generate Room Invite:**
  - In the workspace header, click the **"Share / Invite"** button (User icon with a plus).
  - Click **"Generate Invite Link"**.
  - Click **"Copy Link"** to copy the URL (it will look like `https://your-app.vercel.app/join/abc123xyz...`).
- [ ] **10.2. Open in Incognito Window:**
  - Open a brand-new Incognito/Private window and paste the invite URL.
  - **Expected Result:** You land on the **Guest Join Page** showing:
    - The name of the workspace.
    - A pill badge: `"Guest Invite"`.
    - An input asking: `"Your Display Name"`.
- [ ] **10.3. Enter Room as Guest:**
  - Type `Alex Rivera (Guest)` and click **"Enter Workspace"**.
  - **Expected Result:** You are immediately granted temporary access to the room as a guest. Your guest name appears in the collaborator presence pill on all connected screens!

---

## 11. End-of-Meeting "Commit Call" & Synthesis Report

- [ ] **11.1. Trigger Commit Call:**
  - In the top workspace header, click the purple **"Commit Call"** button.
- [ ] **11.2. Review Synthesis Modal:**
  - **Expected Result:** A celebratory modal appears summarizing the entire meeting session:
    - **Executive Summary:** A clean paragraph synthesizing what was discussed.
    - **Decisions Ledger:** A bulleted list of all decisions agreed upon during the call.
    - **Action Items Matrix:** Table of tasks, assigned owners, and priority levels.
    - **Risk Register:** Active blockers identified during conversation.
- [ ] **11.3. Copy / Export:**
  - Click **"Copy to Markdown"**.
  - Open a text editor (Notepad, VS Code, or Slack) and paste (`Ctrl+V`).
  - **Expected Result:** Beautiful, GitHub-flavored markdown with clean checkboxes ready to paste into Jira, GitHub Issues, or Slack!

---

## 12. Dashboard, Workspace Management & 404 Error Handling

- [ ] **12.1. Workspaces Dashboard:**
  - Click the **mindMesh** logo (or visit `/dashboard`).
  - **Expected Result:** The Dashboard page displays:
    - A welcome header with your username.
    - A grid of all recently visited and created workspaces.
    - Participant count, room slug, and creation date on each card.
- [ ] **12.2. Delete a Workspace:**
  - Click the three-dots `...` or trash icon on a test workspace card.
  - Confirm the deletion modal.
  - **Expected Result:** The room is deleted from the PostgreSQL database and immediately disappears from your dashboard cards.
- [ ] **12.3. Test the Custom 404 Not Found Page:**
  - In your browser's address bar, type an invalid path:
    `https://your-app.vercel.app/some-broken-page-xyz`
  - **Expected Result:** The custom spatial 404 page opens:
    - Ambient glowing background and dotted grid.
    - Title: *"This canvas drifted into uncharted space."*
    - Monospace token displaying `/some-broken-page-xyz`.
    - Floating preview mock showing the disconnected Goal and Decision cards.
    - Click **"Return to Studio"** or **"All Workspaces"** to navigate smoothly back to safety.

---

## 🎯 Summary Checklist

| # | Feature Area | Status |
| :--- | :--- | :---: |
| 1 | Backend `/api/health` Check | [ ] |
| 2 | Landing Page & Room Slug Randomizer | [ ] |
| 3 | User Signup, Login, & Session Refresh | [ ] |
| 4 | 60fps Infinite Canvas (Pan, Zoom, Reset) | [ ] |
| 5 | Multi-Window Live Cursor & Drag Synchronization | [ ] |
| 6 | Microphone Voice Dictation & Hotkey (`M`) | [ ] |
| 7 | AI Scenario Simulation (Groq / Gemini Extraction) | [ ] |
| 8 | Active Command Bar Manual Node Creation | [ ] |
| 9 | Evidence Provenance ("Why This Exists") | [ ] |
| 10 | Guest Invite Links & Incognito Join | [ ] |
| 11 | End-of-Meeting Commit Call & Markdown Export | [ ] |
| 12 | Dashboard Management & Custom 404 Page | [ ] |

If all 12 sections pass, your **mindMesh** project is performing with **100% full functionality** across frontend, backend, database, WebSockets, and AI pipelines!
