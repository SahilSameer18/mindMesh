# mindMesh

> *The conversation becomes the canvas.*

mindMesh is an AI-powered collaborative visual workspace where teams meet, communicate, and think together on a shared infinite canvas. As participants talk or type, the AI agent understands their ideas, decisions, questions, tasks, and relationships in real time, transforming dialogue into an interactive visual knowledge graph and generative concept visuals.

---

## Key Features

- **The Conversation Becomes the Canvas**: Real-time voice and text dialogue ingestion automatically builds typed visual nodes (Goals, Ideas, Tasks, Decisions, Questions, Risks) and dependency connectors.
- **The Active Command Bar**: Permanent conversational control (`✨ Ask your workspace...`) with dynamic actions like `REORGANIZE_LAYOUT` (roadmap/cluster) and `ANSWER_QUERY` (read-only search & highlighting).
- **"Why This Exists" Evidence System**: Click any AI-generated node to inspect the exact transcript quote, speaker, timestamp, and AI reasoning.
- **Meeting Modes**:
  - **Operational**: Structured top-level agenda lanes, live node population under topics, tracking unresolved questions.
  - **Brainstorm**: Organic mindmap clustering with real-time generative visuals (via Pollinations.ai).
  - **Solo**: Single-user thinking landscape without participant attribution.
- **Presence & "Follow Me"**: Live multiplayer cursors, an interactive radar minimap with viewports, and presenter camera broadcasting ("Follow Me").
- **Commit Call & Integrations**: One-click meeting wrap-up synthesizing an Executive Summary, Decisions Log, and Action Items with export to Slack, Notion, and email (Resend).

---

## Tech Stack

- **Frontend**: React 19, Tailwind CSS v4, Socket.io-client, Lucide Icons, Canvas-Confetti, Vite
- **Backend**: Node.js, Express 5, Socket.io, JWT in httpOnly cookies, bcryptjs
- **Database & ORM**: Neon Serverless PostgreSQL, Prisma 7 with WebSocket Adapter
- **AI Intelligence**: Groq (Llama 3.3 70B), Gemini Flash, and Built-in Deterministic Semantic NLP Fallback
- **Visuals**: Pollinations.ai (free zero-key generative imagery)

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher; v24 recommended)
- npm (v9+)
- A free [Neon](https://neon.tech) PostgreSQL database (or local PostgreSQL)

### 1. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and paste your Neon DATABASE_URL

# Apply database migrations
npx prisma migrate dev --name init

# Start development server (auto-reloading)
npm run dev
```
The server will start at `http://localhost:3000`. Test the health check at `http://localhost:3000/api/health`.

### 2. Frontend Setup
In a separate terminal:
```bash
cd client

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## Project Structure

```
mindMesh/
├── client/                     # React 19 + Tailwind + Vite Frontend
│   ├── src/
│   │   ├── api/                # API client & Socket.io connector
│   │   ├── components/         # Canvas, Nodes, CommandBar, Activity, Meeting
│   │   ├── context/            # RoomContext & AuthContext
│   │   ├── hooks/              # useCanvas, usePresence, useSpeechRecognition
│   │   ├── pages/              # Workspace & Room views
│   │   └── utils/              # Layout math & color tokens
│   └── package.json
│
├── server/                     # Node.js + Express + Prisma Backend
│   ├── prisma/
│   │   └── schema.prisma       # 11 Prisma data models
│   ├── src/
│   │   ├── ai/                 # AI extraction, commands, prompts, providers
│   │   ├── canvas/             # CanvasDocument, layout, deduplication, persistence
│   │   ├── config/             # Environment configuration
│   │   ├── controllers/        # REST route controllers
│   │   ├── integrations/       # Slack, Notion, Email, ImageGen
│   │   ├── middlewares/        # Auth, error, validation middlewares
│   │   ├── realtime/           # Socket.io room, canvas, presence sockets
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # Domain services (room, canvas, ai, transcript)
│   │   └── utils/              # Unified response formatters & sanitizers
│   ├── data/                   # Resilient local room persistence snapshots
│   └── package.json
│
├── PHASE_RECORDS.md            # Phase-wise file modification audit log
├── im.md                       # 8-Phase implementation roadmap
└── .gitignore                  # Root git exclusion rules
```

---

## Author

Designed and engineered by **Sahil Sameer** ([@SahilSameer18](https://github.com/SahilSameer18)).

---

## License
ISC

