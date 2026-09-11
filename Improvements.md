# mindMesh — Bug Fix Implementation Plan

**Date:** September 10, 2026  
**Total Bugs:** 7  
**Estimated Total Time:** ~4.5 hours  
**Order:** Priority-sorted by demo impact (crash risk → data integrity → code quality → architecture)

---

## Overview Map

| # | Bug | Priority | Time | Status |
|---|---|---|---|---|
| 1 | `Zap` icon missing import → runtime crash | 🔴 CRITICAL | 5 min | ✅ DONE |
| 2 | Duplicate `roomMode` in RoomContext | 🟡 MEDIUM | 2 min | ✅ DONE |
| 3 | TranscriptChunks not saved to DB | 🔴 CRITICAL | 45 min | ⏳ Pending |
| 4 | CanvasDocument memory leak | 🟡 MEDIUM | 20 min | ⏳ Pending |
| 5 | `requireRoomAccess` does nothing | 🟡 MEDIUM | 30 min | ⏳ Pending |
| 6 | Canvas:join double-emit on reconnect | 🟠 HIGH | 30 min | ⏳ Pending |
| 7 | `WorkspacePage` is completely empty | 🔴 CRITICAL | 2–3 hrs | ⏳ Pending |

---

## ~~BUG 1~~ ✅ FIXED — Missing `Zap` Import

**Applied diff:**
```diff
 // client/src/components/meeting/SpeechIntelligenceController.jsx
 import {
   Mic, MicOff, Play, Pause, SkipForward, RotateCcw,
   Volume2, ChevronDown, ChevronUp, X, Radio, Clock, Filter,
+  Zap,
 } from "lucide-react";
```
**Status:** Committed. Vite hot-reloaded automatically.

---

## ~~BUG 2~~ ✅ FIXED — Duplicate `roomMode` in RoomContext

**Applied diff:**
```diff
 // client/src/context/RoomContext.jsx  — value object in useMemo
       startPresenting,
       stopPresenting,
       setFollowing,
-      roomMode,       // ← duplicate removed (was line 443)
       systemContext,
       updateRoomMode,
```
**Status:** Committed. `roomMode` still present at line 428 (correct position).

---

## BUG 3 — TranscriptChunks Not Persisted to Database (Commit Report Uses Empty Data)

### What happens
The flow is:
```
Client mic/simulator → socket.emit("transcript:chunk") 
  → transcript.socket.js → extractionQueue.enqueue()
  → processDialogueBatch() → AI extraction → canvas actions
```

The chunks are processed in-memory and drive the AI canvas actions, but **they are never written to the `TranscriptChunk` table in Postgres**. When the user clicks "Commit Meeting", the server queries `prisma.transcriptChunk.findMany({ where: { roomId } })` — this returns an empty array. The Groq/Gemini summarizer then gets zero transcript context, producing a weaker report based only on canvas nodes.

The `TranscriptChunk` Prisma model already exists with the right schema:
```prisma
model TranscriptChunk {
  id        String   @id @default(cuid())
  roomId    String
  speaker   String
  text      String
  createdAt DateTime @default(now())
  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
  @@index([roomId])
}
```

### Affected Files
| File | Path | Change Type |
|---|---|---|
| `transcript.socket.js` | `server/src/realtime/transcript.socket.js` | ADD Prisma write |
| `extraction.js` | `server/src/ai/extraction.js` | ADD bulk persist before AI call |
| `lib/prisma.js` | `server/src/lib/prisma.js` | Already exists, no change |

### Strategy
**Option A (Preferred — in `transcript.socket.js`):** Persist each non-filler chunk immediately after it is accepted and before enqueuing. This guarantees every chunk that reaches the AI also exists in DB. Uses a fire-and-forget `prisma.transcriptChunk.create()` — doesn't block the real-time pipeline.

**Option B (in `extraction.js`):** Bulk-insert the entire batch just before calling the AI. Simpler but misses chunks that are queued but not yet flushed when the user commits.

**Use Option A** — it's safer and matches "every spoken word is recorded."

### Exact Change

**File:** [`transcript.socket.js`](file:///c:/Users/HP/Desktop/mindMesh/server/src/realtime/transcript.socket.js)

```diff
// Line 1 — Add prisma import
  import { extractionQueue, isConversationalFiller } from "../ai/extractionQueue.js";
  import { processDialogueBatch } from "../ai/extraction.js";
+ import prisma from "../lib/prisma.js";
```

```diff
// After line 40 (isFiller broadcast), BEFORE line 43 (filler discard check)
  // 2. Broadcast live speech chunk to all room members for real-time captions
  io.to(roomId).emit("transcript:chunk", {
    ...chunk,
    isFiller,
  });

+ // 2b. Persist non-filler chunks to DB for Commit Report summarization
+ // Fire-and-forget: intentionally not awaited to keep the real-time path non-blocking
+ if (!isFiller) {
+   prisma.transcriptChunk
+     .create({
+       data: {
+         roomId,
+         speaker: chunk.speaker,
+         text: chunk.text,
+       },
+     })
+     .catch((err) => {
+       console.warn("[transcript.socket] Failed to persist chunk to DB:", err.message);
+     });
+ }

  // 3. If filler, discard before queuing to save API quota
  if (isFiller) {
```

### Also needed — verify how `commit.controller.js` queries transcripts

Check that the commit controller queries `transcriptChunk` correctly:

**File:** `server/src/controllers/commit.controller.js` (or wherever commit is handled)

It should contain:
```javascript
const transcripts = await prisma.transcriptChunk.findMany({
  where: { roomId },
  orderBy: { createdAt: "asc" },
});
```
If it queries a different field or table, align it with the schema.

### Verification
1. Open the app, run the Dialogue Simulator through Scenario 1 (all chunks)
2. In your DB client (Neon dashboard), query: `SELECT * FROM "TranscriptChunk" WHERE "roomId" = 'mindmesh-main' ORDER BY "createdAt";`
3. You should see 2–3 rows (one per non-filler chunk)
4. Click "Commit Meeting" — the report should now have specific speaker quotes in the executive summary

### Time: 45 minutes

---

## BUG 4 — CanvasDocument Memory Leak (Never Evicted on Empty Room)

### What happens
`getCanvasDocument(roomId)` adds a `CanvasDocument` to the `activeDocuments` Map and never removes it — even after all users disconnect. Over a long-running session, every room ever visited stays in RAM permanently, including all their nodes and edges in their in-memory Maps.

The fix already exists in the codebase — `closeCanvasDocument(roomId)` is exported from `canvasDocument.js` and does exactly the right thing (flushes pending writes, clears maps, removes from `activeDocuments`). It just needs to be called in the right place.

### Affected Files
| File | Path | Change Type |
|---|---|---|
| `presence.service.js` | `server/src/services/presence.service.js` | ADD call to `closeCanvasDocument` |
| `canvasDocument.js` | `server/src/canvas/canvasDocument.js` | Already has `closeCanvasDocument` — no change |

### Exact Change

**File:** [`presence.service.js`](file:///c:/Users/HP/Desktop/mindMesh/server/src/services/presence.service.js)

```diff
// Line 1 — Add import
+ import { closeCanvasDocument } from "../canvas/canvasDocument.js";
```

```diff
// In handleSocketDisconnect(), after line 214 (removePeer call), BEFORE line 209 (peer-left broadcast)

  // 2. Remove peer from room registry
  const remainingPeers = removePeer(roomId, socket.id);

+ // 2b. If room is now empty, evict the CanvasDocument from memory to prevent leak
+ if (remainingPeers.length === 0) {
+   closeCanvasDocument(roomId).catch((err) => {
+     console.warn(`[presence.service] Failed to close canvas doc for ${roomId}:`, err.message);
+   });
+ }

  // 3. Broadcast departure to room peers
  socket.to(roomId).emit("presence:peer-left", {
```

> ⚠️ **Important:** `closeCanvasDocument` calls `doc.flushPendingWrites()` internally, which means any debounced `MOVE_NODE` persists are safely committed to DB before eviction. No data loss.

### Verification
1. Open the app with 1 user, move some nodes around
2. Open server logs — you should see `[CanvasDocument] ...` persist logs
3. Disconnect the user
4. Server should log something like `[presence.service] Closing canvas doc for mindmesh-main` (add a `console.log` temporarily)
5. Verify memory is not growing by re-joining and leaving multiple rooms

### Time: 20 minutes

---

## BUG 5 — `requireRoomAccess` Middleware Grants Access Without Any Check

### What happens
The middleware is called on every room-scoped API route but only calls `next()` unconditionally:

```javascript
// Current (broken):
export async function requireRoomAccess(req, res, next) {
  const user = getCurrentUser(req);
  req.user = user;
  req.roomRole = user.role || "member";
  next(); // No actual membership check
}
```

Any request — authenticated or not — can access any room's canvas, commit report, transcripts, or delete the room.

### Affected Files
| File | Path | Change Type |
|---|---|---|
| `auth.middleware.js` | `server/src/middlewares/auth.middleware.js` | REPLACE `requireRoomAccess` |

### Exact Change

**File:** [`auth.middleware.js`](file:///c:/Users/HP/Desktop/mindMesh/server/src/middlewares/auth.middleware.js)

```diff
- export async function requireRoomAccess(req, res, next) {
-   const user = getCurrentUser(req);
-   req.user = user;
-   req.roomRole = user.role || "member";
-   next();
- }

+ export async function requireRoomAccess(req, res, next) {
+   const user = getCurrentUser(req);
+   req.user = user;
+ 
+   // Demo users always get access (guest-friendly open access for prototype)
+   if (user.isDemo) {
+     req.roomRole = "member";
+     return next();
+   }
+ 
+   // For authenticated users, verify they are a member of this specific room
+   const { roomId } = req.params;
+   if (roomId) {
+     try {
+       const membership = await prisma.roomMember.findUnique({
+         where: {
+           roomId_userId: {
+             roomId,
+             userId: user.id,
+           },
+         },
+       });
+ 
+       if (!membership) {
+         // Not a member — deny access
+         return sendError(res, "Access denied", ["You are not a member of this room"], 403);
+       }
+ 
+       req.roomRole = membership.role;
+     } catch (err) {
+       console.error("[requireRoomAccess] DB error:", err.message);
+       // Fail open for prototype resilience — log but don't block
+       req.roomRole = "member";
+     }
+   } else {
+     req.roomRole = "member";
+   }
+ 
+   next();
+ }
```

**Also add prisma import at top of the file:**
```diff
  import jwt from "jsonwebtoken";
  import { config } from "../config/env.js";
  import { sendError } from "../utils/response.js";
+ import prisma from "../lib/prisma.js";
```

> **Design note:** Demo users (`user.isDemo = true`) bypass the check — this keeps the guest/demo flow working without authentication. Only real JWT-authenticated users trigger the membership check.

### Verification
1. With a demo user (no JWT cookie), all room routes should still work (open access)
2. If you add real auth: a user with a valid JWT who is NOT a room member gets 403
3. Check that the existing `getOrCreateRoom` flow that adds the creator as "owner" still functions

### Time: 30 minutes

---

## BUG 6 — Double `canvas:join` Emission on Socket Reconnect

### What happens
In [`RoomContext.jsx`](file:///c:/Users/HP/Desktop/mindMesh/client/src/context/RoomContext.jsx), the `useEffect` does two things:
1. Registers `socket.on("connect", handleConnect)` — fires `canvas:join` on future connects
2. Checks `if (socket.connected) { handleConnect(); }` — fires `canvas:join` immediately if already connected

On first mount when the socket is already connected (common on dev hot reload, page navigation, or tab restore), **both paths fire**: `handleConnect()` from the immediate check AND the `"connect"` event fires again in the next microtask tick. The server receives two `canvas:join` calls from the same socket, creating a double presence entry.

### Affected Files
| File | Path | Lines |
|---|---|---|
| `RoomContext.jsx` | `client/src/context/RoomContext.jsx` | Lines 128–144, Lines 260–263 |

### Exact Change

**File:** [`RoomContext.jsx`](file:///c:/Users/HP/Desktop/mindMesh/client/src/context/RoomContext.jsx)

```diff
  useEffect(() => {
    if (!socket) return;

+   // Guard prevents double-join if socket fires 'connect' immediately after 
+   // the synchronous already-connected check below
+   let hasJoined = false;

    const handleConnect = () => {
+     if (hasJoined) return;
+     hasJoined = true;
      setIsConnected(true);
      // Re-join canvas room on every connect/reconnect
      socket.emit("canvas:join", { roomId, user: currentUser }, (ack) => {
        if (!ack?.success) {
          console.warn("[Socket] Join acknowledgment error:", ack?.error);
        } else {
          if (ack.activePresenter) setActivePresenter(ack.activePresenter);
          if (ack.mode) setRoomMode(ack.mode);
          if (ack.systemContext) setSystemContext(ack.systemContext);
        }
      });
    };
    
    // ... other handlers ...

    socket.on("connect", handleConnect);
    // ... other socket.on calls ...

    // If socket is already connected when effect mounts
    if (socket.connected) {
      handleConnect();
    }

    return () => {
+     hasJoined = false; // Reset for potential remount
      socket.off("connect", handleConnect);
      // ... other socket.off calls ...
      socket.emit("canvas:leave");
    };
  }, [socket, roomId, currentUser]);
```

> **Why `hasJoined` instead of removing the already-connected check?** The already-connected check is necessary — without it, if the socket connects before the effect runs (common), the `"connect"` event fires before the listener is attached and the user never joins. The `hasJoined` ref prevents the double-fire case cleanly.

### Verification
1. Open the app in a tab
2. Open browser DevTools → Network → WS → find the socket connection
3. Filter for `canvas:join` messages — should see exactly 1 emission per page load
4. Refresh the page and verify still exactly 1 emission
5. On server logs, confirm peer shows up only once in presence registry

### Time: 30 minutes

---

## BUG 7 — `WorkspacePage` is Empty (No Room Discovery / Lobby Flow)

### What happens
[`WorkspacePage.jsx`](file:///c:/Users/HP/Desktop/mindMesh/client/src/pages/WorkspacePage.jsx) currently exports an empty function — there is no UI between the Landing page and the canvas room. Users click "Enter Workspace" and are immediately dropped into the hardcoded `mindmesh-main` room.

For competition judges, this means:
- They can't see multi-room capability
- They can't create a named room for a specific meeting topic
- They can't share a room link or invite others by URL
- The product story "teams collaborate in their own named room" is invisible

### Affected Files
| File | Path | Change Type |
|---|---|---|
| `WorkspacePage.jsx` | `client/src/pages/WorkspacePage.jsx` | REPLACE (currently empty) |
| `App.jsx` or router | `client/src/App.jsx` | Verify routing passes `setRoomId` down |
| `rooms.api.js` | `client/src/api/rooms.api.js` | Verify `listRooms()` API call exists |

### Design: What to Build
A minimal but polished **Room Lobby** with these elements:
1. **Header** — "mindMesh Workspace" with user avatar / name
2. **Quick join** — input field to type a room ID/name + "Join Room" button
3. **Create new** — "Start Meeting" button that generates a room name and navigates
4. **Recent rooms** — fetched from `GET /api/rooms` (already implemented in server), showing last 5 rooms with node/member counts
5. **Share link** — each room card shows its URL for copying

### Exact Change

**File:** [`WorkspacePage.jsx`](file:///c:/Users/HP/Desktop/mindMesh/client/src/pages/WorkspacePage.jsx) — full replacement:

```jsx
import { useState, useEffect } from "react";
import { Users, Plus, ArrowRight, Copy, Check, Layers, Zap } from "lucide-react";
import { roomsApi } from "../api/rooms.api.js";

export default function WorkspacePage({ onJoinRoom }) {
  const [roomInput, setRoomInput] = useState("");
  const [recentRooms, setRecentRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    roomsApi.list()
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setRecentRooms(json.data.slice(0, 6));
        }
      })
      .catch(() => {}) // Silent fail — show empty state
      .finally(() => setIsLoading(false));
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    const id = roomInput.trim().toLowerCase().replace(/\s+/g, "-") || "mindmesh-main";
    onJoinRoom(id);
  };

  const handleCreateNew = () => {
    const adjectives = ["swift", "bright", "bold", "clear", "deep", "sharp", "wide"];
    const nouns = ["sync", "brief", "standup", "review", "plan", "summit", "sprint"];
    const id = `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${Date.now().toString(36).slice(-4)}`;
    onJoinRoom(id);
  };

  const handleCopyLink = (roomId) => {
    navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-app text-text-main flex flex-col">
      {/* Header */}
      <header className="border-b border-border-subtle px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-text-main font-display">mindMesh</span>
        <span className="text-xs text-text-muted ml-1">Workspace</span>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 space-y-10">
        {/* Quick Join / Create */}
        <section>
          <h1 className="text-2xl font-bold text-text-main mb-1">Your Workspace</h1>
          <p className="text-sm text-text-muted mb-6">Join an existing room or start a new collaborative session.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Join by name */}
            <form onSubmit={handleJoin} className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Join a Room</label>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Room name or ID..."
                className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-main placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-violet-600/20"
              >
                Join Room <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Create new */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 flex flex-col">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">New Meeting</label>
              <p className="text-xs text-text-muted flex-1">Start a fresh canvas with AI-powered collaborative intelligence.</p>
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-2 bg-surface-subtle hover:bg-surface border border-border-subtle text-text-main text-sm font-semibold py-2.5 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4 text-emerald-500" />
                Start New Session
              </button>
            </div>
          </div>
        </section>

        {/* Recent Rooms */}
        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Recent Rooms
          </h2>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-surface border border-border-subtle animate-pulse" />
              ))}
            </div>
          ) : recentRooms.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-10 border border-dashed border-border-subtle rounded-2xl">
              No rooms yet — create your first session above.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recentRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col gap-3 hover:border-violet-500/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text-main">{room.name}</p>
                      <p className="text-[11px] text-text-muted font-mono">{room.id}</p>
                    </div>
                    <button
                      onClick={() => handleCopyLink(room.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors shrink-0"
                      title="Copy invite link"
                    >
                      {copiedId === room.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {room._count?.nodes ?? 0} nodes
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {room._count?.members ?? 0} members
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-surface-subtle text-[10px] font-medium capitalize">
                      {room.mode}
                    </span>
                  </div>

                  <button
                    onClick={() => onJoinRoom(room.id)}
                    className="w-full text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 flex items-center justify-center gap-1.5 py-1.5 rounded-xl hover:bg-violet-500/10 transition-colors"
                  >
                    Open Room <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
```

### Also needed — verify `rooms.api.js` has `list()` method

**File:** `client/src/api/rooms.api.js`

Confirm or add:
```javascript
export const roomsApi = {
  // ... existing methods ...
  list: () => fetchWithAuth("/api/rooms"),
};
```

### Also needed — wire `onJoinRoom` prop in App.jsx

**File:** `client/src/App.jsx`

The `WorkspacePage` needs `onJoinRoom(roomId)` to navigate to `RoomPage`. Verify your router passes this correctly:

```jsx
// In App.jsx routing, ensure WorkspacePage gets onJoinRoom:
<WorkspacePage onJoinRoom={(id) => setCurrentRoom(id)} />
```

### Verification
1. Open the app, go to the Workspace page — should show the join form + recent rooms grid
2. Click "Start New Session" — navigates to a new uniquely-named room
3. In that room, go back to Workspace — the room you just left appears in the recent list
4. Click "Copy link" on a room — paste it somewhere, verify it includes `?room=roomId`
5. Open that URL in another tab — it should join the same room

### Time: 2–3 hours

---

## Execution Order

```
✅ Bug 1  — Zap import      DONE
✅ Bug 2  — roomMode dup    DONE
⏳ Bug 6  — double join     (30 min)  → next
⏳ Bug 3  — TranscriptChunk (45 min)
⏳ Bug 4  — Memory leak     (20 min)
⏳ Bug 5  — requireRoomAccess (30 min)
⏳ Bug 7  — WorkspacePage   (2-3 hrs)
```

**Remaining time: ~4.5 hours**

---

## Files Summary Table

| File | Bug(s) | Type of Change |
|---|---|---|
| `client/src/components/meeting/SpeechIntelligenceController.jsx` | #1 | Add `Zap` to import |
| `client/src/context/RoomContext.jsx` | #2, #6 | Remove duplicate key; add `hasJoined` guard |
| `server/src/realtime/transcript.socket.js` | #3 | Add `prisma.transcriptChunk.create()` |
| `server/src/lib/prisma.js` | #3 | No change (already exists) |
| `server/src/services/presence.service.js` | #4 | Import + call `closeCanvasDocument` |
| `server/src/canvas/canvasDocument.js` | #4 | No change (already has `closeCanvasDocument`) |
| `server/src/middlewares/auth.middleware.js` | #5 | Replace `requireRoomAccess` body |
| `client/src/pages/WorkspacePage.jsx` | #7 | Full file replacement |
| `client/src/api/rooms.api.js` | #7 | Add `list()` method if missing |
| `client/src/App.jsx` | #7 | Wire `onJoinRoom` prop |