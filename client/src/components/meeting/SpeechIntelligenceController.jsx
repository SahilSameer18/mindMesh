import { useState, useEffect, useRef, useCallback } from "react";
import { useRoom } from "../../hooks/useRoom.js";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sparkles,
  Volume2,
  ChevronDown,
  ChevronUp,
  X,
  Radio,
  Clock,
  Filter,
} from "lucide-react";

export const BENCHMARK_SCENARIOS = [
  {
    id: "canonical-debate",
    title: "1. Canonical Onboarding Debate",
    description: "Elena and Marcus establish goal, task, dependency, and blocking relation.",
    chunks: [
      {
        speaker: "Elena Vance",
        role: "Product Lead",
        color: "#8b5cf6",
        text: "We need to improve onboarding.",
      },
      {
        speaker: "Marcus Sterling",
        role: "Tech Lead",
        color: "#06b6d4",
        text: "Mike will redesign the dashboard, but analytics needs to be ready first.",
      },
    ],
  },
  {
    id: "live-reassignment",
    title: "2. Live Reassignment & Correction",
    description: "In-place card correction: Mike is reassigned to Sam without creating duplicate nodes.",
    chunks: [
      {
        speaker: "Elena Vance",
        role: "Product Lead",
        color: "#8b5cf6",
        text: "Actually, Mike is busy with auth. Sam will take the dashboard instead.",
      },
      {
        speaker: "Marcus Sterling",
        role: "Tech Lead",
        color: "#06b6d4",
        text: "Sounds good, let's make sure Sam syncs with analytics.",
      },
    ],
  },
  {
    id: "architecture-risk",
    title: "3. Architecture & Risk Mitigation",
    description: "Extracts database migration task, latency risk card, and Redis caching mitigation.",
    chunks: [
      {
        speaker: "Elena Vance",
        role: "Product Lead",
        color: "#8b5cf6",
        text: "We are migrating the database to Postgres, but latency might spike during high loads.",
      },
      {
        speaker: "Marcus Sterling",
        role: "Tech Lead",
        color: "#06b6d4",
        text: "Let's add Redis caching to mitigate the database latency risk.",
      },
      {
        speaker: "Elena Vance",
        role: "Product Lead",
        color: "#8b5cf6",
        text: "Agreed. Redis cache should unblock database migration.",
      },
    ],
  },
  {
    id: "fluff-filter",
    title: "4. Fluff Filter & Short Decision",
    description: "Proves pure conversational filler is dropped, but short hand-offs ('Sam takes it') are saved.",
    chunks: [
      {
        speaker: "Elena Vance",
        role: "Product Lead",
        color: "#8b5cf6",
        text: "Yeah, uh-huh, okay cool.", // Filtered
      },
      {
        speaker: "Marcus Sterling",
        role: "Tech Lead",
        color: "#06b6d4",
        text: "Sam takes it.", // Preserved decision
      },
    ],
  },
];

export default function SpeechIntelligenceController({ isOpen, onClose }) {
  const { socket, roomId, currentUser } = useRoom();

  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x | 2x | 3x
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [micStatus, setMicStatus] = useState("idle"); // "idle" | "listening" | "unsupported" | "error"

  // Live Captions & Ticker State
  const [latestCaption, setLatestCaption] = useState(null);
  const [recentChunks, setRecentChunks] = useState([]);
  const [lastExtractionNotice, setLastExtractionNotice] = useState(null);

  const recognitionRef = useRef(null);
  const isMicActiveRef = useRef(false);
  const playTimerRef = useRef(null);

  const currentScenario = BENCHMARK_SCENARIOS[selectedScenarioIndex];

  // Helper to emit chunk over socket
  const emitChunk = useCallback(
    (chunk) => {
      if (!socket) return;
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const payload = {
        roomId,
        speaker: chunk.speaker || currentUser.name || "Collaborator",
        userId: chunk.userId || currentUser.id,
        text: chunk.text,
        timestamp,
      };

      socket.emit("transcript:chunk", payload);
    },
    [socket, roomId, currentUser]
  );

  // Listen for socket transcript events
  useEffect(() => {
    if (!socket) return;

    const handleTranscriptChunk = (data) => {
      setLatestCaption(data);
      setRecentChunks((prev) => [data, ...prev.slice(0, 7)]);
    };

    const handleTranscriptProcessed = (data) => {
      setLastExtractionNotice({
        summary: data.summary,
        count: data.actionCount,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      // Clear notice after 6 seconds
      setTimeout(() => {
        setLastExtractionNotice((curr) => (curr?.summary === data.summary ? null : curr));
      }, 6000);
    };

    socket.on("transcript:chunk", handleTranscriptChunk);
    socket.on("transcript:processed", handleTranscriptProcessed);

    return () => {
      socket.off("transcript:chunk", handleTranscriptChunk);
      socket.off("transcript:processed", handleTranscriptProcessed);
    };
  }, [socket]);

  // Step next chunk in benchmark sequence
  const handleStepNext = useCallback(() => {
    if (currentChunkIndex >= currentScenario.chunks.length) {
      setCurrentChunkIndex(0);
      return;
    }

    const chunk = currentScenario.chunks[currentChunkIndex];
    emitChunk(chunk);
    setCurrentChunkIndex((prev) => prev + 1);
  }, [currentChunkIndex, currentScenario, emitChunk]);

  // Handle Play/Pause Auto-Timer
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const intervalMs = Math.max(800, Math.round(2800 / playbackSpeed));

    playTimerRef.current = setInterval(() => {
      setCurrentChunkIndex((curr) => {
        if (curr >= currentScenario.chunks.length) {
          setIsPlaying(false);
          return curr;
        }
        const chunk = currentScenario.chunks[curr];
        emitChunk(chunk);
        return curr + 1;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, currentScenario, emitChunk]);

  // Reset sequence & flush buffer
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentChunkIndex(0);
    if (socket) {
      socket.emit("transcript:flush", { roomId });
    }
  };

  // Cleanup speech recognition on component unmount
  useEffect(() => {
    return () => {
      isMicActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Live Microphone Integration (Web Speech API)
  const toggleMicrophone = () => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setMicStatus("unsupported");
      alert("Web Speech API is not supported in this browser. Please use Chrome/Edge or the simulator.");
      return;
    }

    if (isMicActiveRef.current) {
      isMicActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsMicActive(false);
      setMicStatus("idle");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        isMicActiveRef.current = true;
        setIsMicActive(true);
        setMicStatus("listening");
      };

      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim();
          if (transcript) {
            emitChunk({
              speaker: currentUser.name || "You",
              text: transcript,
            });
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn("[Speech] Recognition error:", event.error);
        if (event.error !== "no-speech") {
          setMicStatus("error");
          isMicActiveRef.current = false;
          setIsMicActive(false);
        }
      };

      recognition.onend = () => {
        if (isMicActiveRef.current) {
          // Restart if user intended to keep listening
          try {
            recognition.start();
          } catch {
            isMicActiveRef.current = false;
            setIsMicActive(false);
            setMicStatus("idle");
          }
        } else {
          setMicStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("[Speech] Failed to start microphone:", err);
      setMicStatus("error");
      isMicActiveRef.current = false;
      setIsMicActive(false);
    }
  };

  if (!isOpen) {
    // Show subtle floating live caption ticker at bottom when closed
    if (!latestCaption) return null;
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-xl w-[90%] px-4 py-2.5 rounded-xl bg-slate-950/85 border border-slate-800/80 shadow-xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <span className="text-xs font-semibold text-sky-400 shrink-0">
          {latestCaption.speaker}:
        </span>
        <span className="text-xs text-slate-200 truncate flex-1 font-sans">
          "{latestCaption.text}"
        </span>
        {latestCaption.isFiller && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium shrink-0">
            Fluff
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Speech Intelligence Simulator"
      className={`fixed top-16 left-4 z-40 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-slate-800/90 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl transition-all duration-300 ${
        isMinimized ? "p-3" : "p-4 sm:p-5"
      }`}
    >
      {/* Dock Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isPlaying || isMicActive
                ? "bg-violet-600 text-white animate-pulse"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-display flex items-center gap-1.5">
              Dialogue Sim
              {(isPlaying || isMicActive) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </h3>
            <p className="text-[10px] text-slate-400">Passive Speech Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title={isMinimized ? "Expand dock" : "Minimize dock"}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title="Close dock"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="mt-3 space-y-3.5">
          {/* Scenario Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Benchmark Scenario
            </label>
            <select
              value={selectedScenarioIndex}
              onChange={(e) => {
                setSelectedScenarioIndex(Number(e.target.value));
                setCurrentChunkIndex(0);
                setIsPlaying(false);
              }}
              className="w-full text-xs font-medium bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            >
              {BENCHMARK_SCENARIOS.map((s, idx) => (
                <option key={s.id} value={idx}>
                  {s.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {currentScenario.description}
            </p>
          </div>

          {/* Script Step Timeline */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800/80 p-2.5 space-y-1.5 max-h-32 overflow-y-auto">
            {currentScenario.chunks.map((c, i) => {
              const isPast = i < currentChunkIndex;
              const isCurrent = i === currentChunkIndex;
              return (
                <div
                  key={i}
                  className={`text-xs p-1.5 rounded-lg flex items-start gap-2 transition-all ${
                    isCurrent
                      ? "bg-violet-600/25 border border-violet-500/40 text-slate-100 font-medium"
                      : isPast
                      ? "opacity-50 text-slate-400"
                      : "opacity-80 text-slate-300"
                  }`}
                >
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: `${c.color}25`, color: c.color }}
                  >
                    {c.speaker.split(" ")[0]}
                  </span>
                  <span className="flex-1 text-[11px] leading-snug">"{c.text}"</span>
                  {isCurrent && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500/30 text-violet-300 font-mono shrink-0">
                      NEXT
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
            {/* Play/Pause & Step */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
                className={`p-2 rounded-xl text-white font-medium shadow-md transition-all ${
                  isPlaying
                    ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-600/20"
                }`}
                title={isPlaying ? "Pause simulation" : "Play dialogue sequence"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>

              <button
                type="button"
                onClick={handleStepNext}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 transition-colors"
                title="Step forward 1 dialogue turn"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-400 hover:text-slate-200 transition-colors"
                title="Reset sequence and flush buffer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              {[1, 2, 3].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    playbackSpeed === speed
                      ? "bg-violet-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Browser Mic Toggle */}
            <button
              type="button"
              onClick={toggleMicrophone}
              className={`p-2 rounded-xl font-medium transition-all ${
                isMicActive
                  ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30"
                  : "bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700/90"
              }`}
              title={isMicActive ? "Stop microphone" : "Speak live via browser microphone"}
            >
              {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          </div>

          {/* AI Extraction Banner Alert if actions occurred */}
          {lastExtractionNotice && (
            <div className="p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/40 text-violet-200 text-xs flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="font-medium truncate">{lastExtractionNotice.summary}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/30 font-bold shrink-0">
                +{lastExtractionNotice.count} actions
              </span>
            </div>
          )}

          {/* Live Captions Feed */}
          {latestCaption && (
            <div className="pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-sky-400" />
                  Live Caption Ticker
                </span>
                <span className="font-mono">{latestCaption.timestamp}</span>
              </div>
              <div className="text-xs bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 text-slate-200 flex items-start gap-2">
                <span className="font-bold text-sky-400 text-[11px] shrink-0">
                  {latestCaption.speaker}:
                </span>
                <span className="flex-1 font-sans text-[11px] leading-relaxed">
                  "{latestCaption.text}"
                </span>
                {latestCaption.isFiller && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0">
                    FILLER
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
