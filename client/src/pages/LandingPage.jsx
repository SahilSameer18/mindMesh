import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  Mic,
  Layers,
  Check,
  Copy,
  Users,
  Play,
  Shield,
  Globe,
  Dices,
  Radio,
  Share2,
  Calendar,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  X,
  FileText,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useRouter } from "../app.routes.jsx";
import { getUserInitials, getUserColor } from "../utils/colors.js";

const COOL_ROOM_SLUGS = [
  "aurora-sprint",
  "quantum-design",
  "matrix-sync",
  "nexus-architecture",
  "prism-roadmap",
  "hyper-brainstorm",
  "pulse-retro",
  "orbit-ops",
  "vortex-strategy",
  "zenith-sprint",
];

const ONTOLOGY_CARDS = [
  { type: "goal", icon: "🎯", label: "Goal", desc: "Core sprint milestone or high-level strategic target." },
  { type: "task", icon: "🟢", label: "Task", desc: "Actionable deliverable with assignee, priority, and checkbox." },
  { type: "decision", icon: "🔵", label: "Decision", desc: "Resolved technical or architectural choices agreed by the team." },
  { type: "risk", icon: "🔴", label: "Risk", desc: "Blockers, technical debt, or potential points of failure." },
  { type: "question", icon: "🟣", label: "Question", desc: "Unresolved debate requiring investigation or consensus." },
  { type: "idea", icon: "💡", label: "Idea", desc: "Freeform concept or exploratory solution proposal." },
  { type: "person", icon: "👤", label: "Person", desc: "Team stakeholder, owner, or subject matter expert." },
  { type: "image", icon: "🖼️", label: "Visual", desc: "AI-generated concept diagram or architectural mockup." },
];

export default function LandingPage() {
  const { navigateToRoom } = useRouter();

  // Name state
  const [userName, setUserName] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("mindmesh_username") || "";
    }
    return "";
  });

  // Room Creator State
  const [roomName, setRoomName] = useState(() => {
    const randomIndex = Math.floor(Math.random() * COOL_ROOM_SLUGS.length);
    return COOL_ROOM_SLUGS[randomIndex];
  });
  const [roomMode, setRoomMode] = useState("operational"); // operational | brainstorm
  const [isRolling, setIsRolling] = useState(false);

  // Join by Code State
  const [joinCode, setJoinCode] = useState("");
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // Recent Rooms & Deletion State
  const [recentRooms, setRecentRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setRoomToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Ontology Active Tab
  const [selectedOntology, setSelectedOntology] = useState(ONTOLOGY_CARDS[0]);

  // Sync user name with localStorage
  const handleNameChange = (e) => {
    const val = e.target.value;
    setUserName(val);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("mindmesh_username", val.trim());
    }
  };

  // Roll new cool room slug
  const rollRoomSlug = () => {
    setIsRolling(true);
    setTimeout(() => {
      const filtered = COOL_ROOM_SLUGS.filter((s) => s !== roomName);
      const nextSlug = filtered[Math.floor(Math.random() * filtered.length)];
      setRoomName(nextSlug);
      setIsRolling(false);
    }, 200);
  };

  // Fetch active rooms from server API
  useEffect(() => {
    let isMounted = true;
    async function fetchRooms() {
      try {
        const apiBase =
          import.meta.env.VITE_SERVER_URL ||
          (typeof window !== "undefined" && window.location.port === "5173"
            ? `${window.location.protocol}//${window.location.hostname}:3000`
            : "");

        const res = await fetch(`${apiBase}/api/rooms`, { credentials: "include" });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && isMounted) {
            setRecentRooms(json.data);
          }
        }
      } catch (err) {
        console.warn("[LandingPage] Could not fetch rooms list:", err);
      } finally {
        if (isMounted) setIsLoadingRooms(false);
      }
    }
    fetchRooms();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Room Deletion with Custom In-App Modal (No browser window.confirm)
  const handleDeleteClick = (e, room) => {
    e.stopPropagation();
    setRoomToDelete(room);
  };

  const handleExecuteDeleteRoom = async () => {
    if (!roomToDelete) return;
    setIsDeletingRoom(true);
    const targetRoomId = roomToDelete.id;
    try {
      const apiBase =
        import.meta.env.VITE_SERVER_URL ||
        (typeof window !== "undefined" && window.location.port === "5173"
          ? `${window.location.protocol}//${window.location.hostname}:3000`
          : "");

      const res = await fetch(`${apiBase}/api/rooms/${encodeURIComponent(targetRoomId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setRecentRooms((prev) => prev.filter((r) => r.id !== targetRoomId));
        toast.success(`Workspace "${roomToDelete.name || targetRoomId}" permanently deleted.`);
        setRoomToDelete(null);
      } else {
        toast.error("Failed to delete workspace from server.");
      }
    } catch (err) {
      console.error("[LandingPage] Could not delete room:", err);
      toast.error("Network error while deleting workspace.");
    } finally {
      setIsDeletingRoom(false);
    }
  };

  // Handle Launching Room
  const handleLaunchRoom = (e) => {
    e?.preventDefault();
    const finalRoomId = roomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-") || "workspace-1";
    if (userName.trim() && typeof localStorage !== "undefined") {
      localStorage.setItem("mindmesh_username", userName.trim());
    }
    toast.info(`Launching workspace #${finalRoomId}...`);
    navigateToRoom(finalRoomId);
  };

  // Handle Joining Existing Room
  const handleJoinExisting = (e) => {
    e?.preventDefault();
    if (!joinCode.trim()) return;
    let cleanCode = joinCode.trim();
    // Support pasting full URL like http://localhost:5173/?room=xyz
    try {
      if (cleanCode.includes("?room=")) {
        const urlObj = new URL(cleanCode);
        cleanCode = urlObj.searchParams.get("room") || cleanCode;
      }
    } catch {}
    cleanCode = cleanCode.replace(/[^a-zA-Z0-9-_]/g, "");
    navigateToRoom(cleanCode);
  };

  // Handle 1-Click Demo
  const handleLaunchDemo = () => {
    if (!userName.trim() && typeof localStorage !== "undefined") {
      localStorage.setItem("mindmesh_username", "Explorer");
    }
    navigateToRoom("demo-room");
  };

  const userInitials = useMemo(() => getUserInitials(userName || "Guest"), [userName]);
  const userColor = useMemo(() => getUserColor(userName || "Guest"), [userName]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden font-sans relative">
      {/* Ambient Background Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-sky-500/15 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -left-32 w-[500px] h-[400px] bg-purple-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-[60%] -right-32 w-[550px] h-[450px] bg-sky-600/10 blur-[130px] rounded-full" />
      </div>

      {/* Top Navigation Bar */}
      <header className="w-full h-16 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              mindMesh
            </span>
          </div>
        </div>

        {/* Status indicator & Quick CTAs */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] text-slate-400">AI Dual-Engine:</span>
            <span className="text-emerald-400 font-semibold">Ready</span>
          </div>

          <button
            type="button"
            onClick={handleLaunchDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-850 border border-slate-800 transition-all active:scale-95"
          >
            <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
            <span>Try Demo</span>
          </button>

          <a
            href="#quick-launch"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content Flow */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 space-y-16 sm:space-y-24 z-10">
        
        {/* HERO SECTION */}
        <section className="space-y-8 sm:space-y-10 text-center max-w-4xl mx-auto pt-2 sm:pt-6">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-xs text-indigo-300 shadow-lg shadow-indigo-500/10 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-semibold tracking-wide uppercase text-[10px]">Real-Time Dialogue to Knowledge Graph</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.15] sm:leading-[1.1] text-balance">
            The conversation becomes{" "}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              the canvas.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-balance">
            Speak naturally in team meetings. mindMesh's dual-engine intelligence listens, extracts goals, decisions,
            and tasks, and maps relational dependencies on a live 60fps infinite canvas in real time.
          </p>

          {/* QUICK LAUNCHER CONTROL CARD */}
          <div
            id="quick-launch"
            className="w-full max-w-xl mx-auto bg-slate-900/80 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all text-left space-y-4 sm:space-y-5 ring-1 ring-white/10"
          >
            {/* Top Accent Gradient Border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

            {/* Inputs Grid */}
            <div className="space-y-4">
              {/* 1. Name Input with Live Avatar */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Your Display Name
                </label>
                <div className="relative flex items-center">
                  <div
                    className="absolute left-3 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-950 transition-colors shadow-sm"
                    style={{ backgroundColor: userColor }}
                  >
                    {userInitials}
                  </div>
                  <input
                    type="text"
                    value={userName}
                    onChange={handleNameChange}
                    placeholder="Enter your name (e.g. Sahil, Alex)"
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-all font-medium"
                  />
                </div>
              </div>

              {/* 2. Room Name with Dice Slug Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    2. Workspace Room
                  </label>
                  <button
                    type="button"
                    onClick={rollRoomSlug}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 transition-colors"
                    title="Generate another cool room name"
                  >
                    <Dices className={`w-3.5 h-3.5 ${isRolling ? "animate-spin" : ""}`} />
                    <span>Randomize</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-slate-500 font-mono select-none">#</span>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="sprint-planning"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-all font-mono"
                  />
                </div>
              </div>

              {/* 3. Meeting Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  3. Meeting Mode
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRoomMode("operational")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      roomMode === "operational"
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>⚡</span>
                    <span>Operational</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomMode("brainstorm")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      roomMode === "brainstorm"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🧠</span>
                    <span>Brainstorm</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={handleLaunchRoom}
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 border border-white/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
              >
                <span>Launch Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={handleLaunchDemo}
                  className="hover:text-sky-400 transition-colors flex items-center gap-1 font-medium"
                >
                  <Play className="w-3 h-3 fill-current text-sky-400" />
                  <span>Instant Demo Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsJoinOpen(!isJoinOpen)}
                  className="hover:text-indigo-400 transition-colors font-medium"
                >
                  {isJoinOpen ? "Hide Join Input" : "Have a Room Link / Code?"}
                </button>
              </div>

              {/* Collapsible Join by Code drawer */}
              {isJoinOpen && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Paste room code or invite link"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleJoinExisting}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                    >
                      Join
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* HERO INTERACTIVE CANVAS PREVIEW MOCKUP */}
        <section className="w-full max-w-5xl mx-auto">
          <div className="text-center space-y-2 mb-6">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
              Live Spatial Canvas Preview
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white">
              Spoken words turn into structured cards
            </h2>
          </div>

          <div className="relative rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-6 md:p-8 backdrop-blur-2xl shadow-2xl overflow-hidden canvas-grid min-h-[380px] sm:min-h-[440px] flex flex-col justify-between">
            {/* Mock Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono font-semibold text-slate-200">#sprint-planning</span>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium text-[10px]">
                  Operational
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-[10px] font-bold flex items-center justify-center text-white border border-slate-900">
                    EV
                  </div>
                  <div className="w-6 h-6 rounded-full bg-cyan-500 text-[10px] font-bold flex items-center justify-center text-slate-900 border border-slate-900">
                    MS
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-[10px] font-bold flex items-center justify-center text-slate-900 border border-slate-900">
                    YOU
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Canvas Graph with 4 Node Cards */}
            <div className="relative my-6 sm:my-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 items-start">
              {/* Goal Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/40 shadow-lg shadow-amber-500/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold text-[10px] flex items-center gap-1">
                    🎯 Goal
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">#goal-1</span>
                </div>
                <p className="text-xs font-semibold text-slate-100">
                  Improve developer onboarding workflow
                </p>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-800">
                  <span>Source: Elena · 10:14 AM</span>
                </div>
              </div>

              {/* Task Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-lg shadow-emerald-500/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold text-[10px] flex items-center gap-1">
                    🟢 Task
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">Assignee: Mike</span>
                </div>
                <p className="text-xs font-semibold text-slate-100">
                  Redesign metrics dashboard interface
                </p>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>blocks: Analytics Readiness</span>
                  <span className="text-emerald-400 font-mono">In Progress</span>
                </div>
              </div>

              {/* Risk Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/40 shadow-lg shadow-rose-500/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-semibold text-[10px] flex items-center gap-1">
                    🔴 Risk
                  </span>
                  <span className="text-[10px] font-mono text-rose-300">High Impact</span>
                </div>
                <p className="text-xs font-semibold text-slate-100">
                  Database latency under concurrent speech batches
                </p>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-800">
                  <span>Mitigation: 3.5s cooldown queue</span>
                </div>
              </div>
            </div>

            {/* Simulated Floating Live Caption Pill */}
            <div className="mx-auto px-4 py-2 rounded-full bg-slate-900/95 border border-emerald-500/50 text-xs text-slate-100 shadow-2xl backdrop-blur-xl flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-slate-400 font-medium">Elena speaking:</span>
              <span className="text-white italic truncate max-w-xs sm:max-w-md">
                "Mike will take the dashboard redesign, but analytics must be ready first."
              </span>
            </div>
          </div>
        </section>

        {/* 4 FEATURE PILLARS */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Built for High-Velocity Product Teams
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Everything in mindMesh happens live while you speak. No typing meeting notes. No stalled follow-ups.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Pillar 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Speech-to-Graph</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero-lag Web Speech API streams local captions with &lt;10ms latency, with cloud Whisper fallback for heavy accents and engineering jargon.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Dual-Provider AI</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Groq Llama 3.3 70B (~300 t/s) primary engine with transparent &lt;100ms failover to Google Gemini Flash. Zero dropped speech extractions.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Dagre Auto-Layout</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                One-click topological tidying using Kahn's algorithm organizes organic brainstorm webs into clear, hierarchical dependency trees.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">1-Click Commit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dual-source synthesis compiles decisions, tasks, and executive briefs into Block Kit for Slack, databases in Notion, and HTML emails via Resend.
              </p>
            </div>
          </div>
        </section>

        {/* 8-NODE KNOWLEDGE ONTOLOGY SHOWCASE */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
              The 8-Node Knowledge Ontology
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              mindMesh doesn't dump unstructured text. It sorts thoughts into discrete semantic building blocks.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {ONTOLOGY_CARDS.map((card) => (
              <button
                key={card.type}
                type="button"
                onClick={() => setSelectedOntology(card)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedOntology.type === card.type
                    ? "bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10"
                    : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-xs font-semibold text-white mb-1">{card.label}</div>
                <div className="text-[11px] text-slate-400 leading-tight">{card.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* RECENT WORKSPACES LIST (IF ANY EXIST) */}
        {recentRooms.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Active Workspaces</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">Real-time DB</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {recentRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {room.name || room.id}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                        {room.mode || "operational"}
                      </span>
                      <span>{room._count?.nodes || 0} cards</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, room)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                      title={`Delete workspace ${room.name || room.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToRoom(room.id)}
                      className="p-2 rounded-lg bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white transition-colors cursor-pointer"
                      title={`Join room ${room.id}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-800/60 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
            mM
          </div>
          <span className="font-display font-semibold text-slate-300">mindMesh</span>
          <span>— The conversation becomes the canvas.</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Built with React 19, Vite, Tailwind CSS, Express 5, Socket.io, Neon PostgreSQL & Groq/Gemini LPUs.
        </p>
      </footer>

      {/* Sleek Dark Mode Workspace Deletion Confirmation Modal */}
      {roomToDelete && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingRoom && setRoomToDelete(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !isDeletingRoom && setRoomToDelete(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 pt-0.5">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Delete Workspace Permanently?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Permanently delete workspace <span className="font-mono text-white font-semibold">#{roomToDelete.name || roomToDelete.id}</span>? All cards, relationships, audio transcripts, and meeting summaries will be wiped from the database.
                </p>
                <p className="text-[11px] text-rose-400 font-medium pt-1">
                  ⚠️ This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800/80 gap-2.5">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                disabled={isDeletingRoom}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteRoom}
                disabled={isDeletingRoom}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingRoom ? "Deleting Workspace..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
