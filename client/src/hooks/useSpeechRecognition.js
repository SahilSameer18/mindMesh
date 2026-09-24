import { useState, useRef, useEffect, useCallback } from "react";

/**
 * mindMesh — Unified Web Speech Recognition Hook
 * 
 * Reuses Phase 5's battle-tested speech state machine:
 * 1. Persistent `isMicActiveRef` ref surviving across async closures (`onstart`, `onend`, `onerror`).
 * 2. Continuous restart on Chromium silence timeouts without throwing `InvalidStateError`.
 * 3. Real-time interim transcript streaming for zero-latency (<10ms) live caption feedback.
 * 4. Graceful handling of "no-speech" pauses and browser permission rejections.
 * 5. Clean teardown on component unmount.
 * 
 * @param {object} options
 * @param {(text: string) => void} [options.onFinalTranscript] - Called when a sentence is finalized
 * @param {(text: string) => void} [options.onInterimTranscript] - Called when interim words change
 * @param {string} [options.lang="en-US"] - BCP-47 language tag
 * @param {boolean} [options.continuous=true] - Keep listening across sentence pauses
 * @returns {object} Recognition controls and reactive states
 */
export function useSpeechRecognition({
  onFinalTranscript,
  onInterimTranscript,
  lang = "en-US",
  continuous = true,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [micStatus, setMicStatus] = useState("idle"); // "idle" | "listening" | "error" | "unsupported"
  const [error, setError] = useState(null);

  // The critical ref: tracks user's explicit intent across async Chromium closures
  const isMicActiveRef = useRef(false);
  const recognitionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  // onend always fires immediately after onerror per the Web Speech API spec.
  // Without this flag, onend's "not listening anymore" branch unconditionally
  // resets micStatus to "idle" in the same tick, clobbering the "error" status
  // onerror just set — so a permission-denied/network failure was invisible to
  // anything checking micStatus (the toast still worked, since it reads the
  // separate `error` string, which onend never touches).
  const hadTerminalErrorRef = useRef(false);
  const callbacksRef = useRef({ onFinalTranscript, onInterimTranscript });

  // Keep callback refs updated without re-triggering speech instance recreation
  useEffect(() => {
    callbacksRef.current = { onFinalTranscript, onInterimTranscript };
  }, [onFinalTranscript, onInterimTranscript]);

  const isSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Initialize SpeechRecognition instance once
  const getOrCreateRecognition = useCallback(() => {
    if (!isSupported) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      isMicActiveRef.current = true;
      hadTerminalErrorRef.current = false;
      setIsListening(true);
      setMicStatus("listening");
      setError(null);
    };

    recognition.onresult = (event) => {
      let currentInterim = "";
      let newlyFinalized = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript || "";
        if (result.isFinal) {
          newlyFinalized += text;
        } else {
          currentInterim += text;
        }
      }

      if (currentInterim) {
        const cleanInterim = currentInterim.trim();
        setInterimTranscript(cleanInterim);
        callbacksRef.current.onInterimTranscript?.(cleanInterim);
      }

      if (newlyFinalized.trim()) {
        const cleanFinal = newlyFinalized.trim();
        setFinalTranscript(cleanFinal);
        setInterimTranscript("");
        callbacksRef.current.onFinalTranscript?.(cleanFinal);
      }
    };

    recognition.onerror = (event) => {
      console.warn("[useSpeechRecognition] Speech error:", event.error);

      // "no-speech" is Chromium's natural silence timeout; do NOT kill listening state
      if (event.error === "no-speech") {
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        hadTerminalErrorRef.current = true;
        setError("Microphone access denied. Please check browser permissions.");
        setMicStatus("error");
        isMicActiveRef.current = false;
        setIsListening(false);
        return;
      }

      setError(`Speech error: ${event.error}`);
      if (event.error === "network") {
        hadTerminalErrorRef.current = true;
        setMicStatus("error");
        isMicActiveRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // The Phase 5 state machine: if user still intended to listen, auto-restart with a 200ms debounce
      // Giving Chromium's audio capture track enough time to completely tear down before starting anew.
      if (isMicActiveRef.current) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (!isMicActiveRef.current) return;
          try {
            recognition.start();
          } catch (err) {
            if (err.name !== "InvalidStateError") {
              console.warn("[useSpeechRecognition] Restart error:", err.message);
              isMicActiveRef.current = false;
              setIsListening(false);
              setMicStatus("idle");
            }
          }
        }, 200);
      } else {
        setIsListening(false);
        // Don't clobber a "error" status onerror just set moments ago (onend
        // always fires right after onerror) — leave it visible until the next
        // successful onstart clears the flag.
        if (!hadTerminalErrorRef.current) {
          setMicStatus("idle");
        }
        hadTerminalErrorRef.current = false;
        setInterimTranscript("");
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [isSupported, continuous, lang]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setMicStatus("unsupported");
      setError("Web Speech API is not supported in this browser.");
      return;
    }

    if (isMicActiveRef.current) return;
    isMicActiveRef.current = true;
    setIsListening(true);
    setMicStatus("listening");
    setError(null);
    setInterimTranscript("");

    const recognition = getOrCreateRecognition();
    if (recognition) {
      try {
        recognition.start();
      } catch (err) {
        if (err.name !== "InvalidStateError") {
          console.warn("[useSpeechRecognition] Failed to start:", err.message);
          isMicActiveRef.current = false;
          setIsListening(false);
          setMicStatus("error");
          setError(err.message);
        }
      }
    }
  }, [isSupported, getOrCreateRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    isMicActiveRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    setIsListening(false);
    setMicStatus("idle");
    setInterimTranscript("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isMicActiveRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Unmount cleanup: ensure mic is released and pending timers cleared
  useEffect(() => {
    return () => {
      isMicActiveRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    isMicActive: isListening, // Aliased for Phase 5 compatibility
    interimTranscript,
    finalTranscript,
    micStatus,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    isMicActiveRef,
  };
}

