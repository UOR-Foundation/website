/**
 * useVoiceConversation — Full Voice Loop Orchestrator
 * ════════════════════════════════════════════════════
 *
 * Uses the browser's native SpeechRecognition API (zero downloads,
 * cross-platform: Chrome, Safari, Edge, mobile browsers).
 *
 * Chains: Native STT → Lumen AI Streaming → TTS
 *
 * States: idle → listening → thinking → speaking → idle
 *
 * @module hologram-ui/hooks/useVoiceConversation
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useVoiceSynthesis, type VoiceEngine } from "./useVoiceSynthesis";

export type VoiceConversationState =
  | "idle"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking";

interface UseVoiceConversationOptions {
  voiceEngine?: VoiceEngine;
  personaId?: string;
  skillId?: string;
  cloudModel?: string;
  screenContext?: string;
  observerBriefing?: string;
  fusionContext?: string;
  onExchange?: (userText: string, assistantText: string) => void;
  onStateChange?: (state: VoiceConversationState) => void;
  onError?: (error: string) => void;
}

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`;

const GREETINGS = [
  "I'm here. Take your time.",
  "Hello. I'm listening whenever you're ready.",
  "Present and listening. What's on your mind?",
  "I'm with you. Speak when it feels right.",
  "Here. No rush — I'm all ears.",
];

/** Get the native SpeechRecognition constructor (cross-browser) */
function getSpeechRecognition() {
  const w = window as any;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => any) | null;
}

export function useVoiceConversation({
  voiceEngine = "web-speech",
  personaId = "hologram",
  skillId,
  cloudModel = "google/gemini-3-flash-preview",
  screenContext,
  observerBriefing,
  fusionContext,
  onExchange,
  onStateChange,
  onError,
}: UseVoiceConversationOptions = {}) {
  const [state, setState] = useState<VoiceConversationState>("idle");
  const stateRef = useRef<VoiceConversationState>("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const conversationHistory = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasGreetedRef = useRef(false);

  // Native STT refs
  const recognitionRef = useRef<any>(null);
  const transcriptAccRef = useRef("");

  // Audio level metering refs
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateState = useCallback((s: VoiceConversationState) => {
    stateRef.current = s;
    setState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  const tts = useVoiceSynthesis({
    engine: voiceEngine,
    rate: 0.95,
    onError: (err) => {
      updateState("idle");
      onError?.(`Voice output error: ${err}`);
    },
  });

  /** Stream query to Lumen AI */
  const queryLumen = useCallback(async (userText: string): Promise<string> => {
    conversationHistory.current.push({ role: "user", content: userText });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const response = await fetch(STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: conversationHistory.current.map(m => ({ role: m.role, content: m.content })),
        model: cloudModel,
        personaId,
        skillId: skillId || "explain",
        screenContext,
        observerBriefing,
        fusionContext,
        voiceMode: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Lumen AI error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            setLastResponse(fullText);
          }
        } catch { /* partial JSON */ }
      }
    }

    conversationHistory.current.push({ role: "assistant", content: fullText });
    return fullText;
  }, [cloudModel, personaId, skillId, screenContext, observerBriefing, fusionContext]);

  /** Clean up all recording/recognition resources */
  const cleanupRecording = useCallback(() => {
    // Stop recognition
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;

    // Stop audio level metering
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    // Stop media stream
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    // Close audio context
    if (audioCtxRef.current?.state !== "closed") {
      void audioCtxRef.current?.close();
    }
    audioCtxRef.current = null;
  }, []);

  /** Process a completed transcript — think → speak */
  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      updateState("idle");
      return;
    }

    setLastTranscript(transcript);

    try {
      updateState("thinking");
      setLastResponse("");
      const response = await queryLumen(transcript);

      if (!response.trim()) {
        updateState("idle");
        return;
      }

      updateState("speaking");
      await tts.speak(response);
      updateState("idle");

      onExchange?.(transcript, response);
    } catch (err) {
      console.error("[Voice] Processing error:", err);
      onError?.(err instanceof Error ? err.message : "Voice conversation error");
      updateState("idle");
    }
  }, [updateState, queryLumen, tts, onExchange, onError]);

  /** Start listening — the main entry point */
  const startListening = useCallback(async () => {
    if (stateRef.current !== "idle") return;

    // Check native STT support
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      onError?.("Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    try {
      // First activation: greet the user
      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        updateState("speaking");
        setLastResponse(greeting);
        conversationHistory.current.push({ role: "assistant", content: greeting });

        console.log("[Voice] Playing greeting:", greeting);
        await tts.speak(greeting);

        console.log("[Voice] Greeting done, opening mic");
        await new Promise(r => setTimeout(r, 300));
      }

      updateState("listening");
      transcriptAccRef.current = "";

      // Get mic stream for audio level metering (visual feedback)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch (micErr: any) {
        if (micErr?.name === "NotAllowedError") {
          onError?.("Microphone permission denied");
        } else if (micErr?.name === "NotFoundError") {
          onError?.("No microphone found");
        } else {
          onError?.("Could not access microphone");
        }
        updateState("idle");
        return;
      }

      streamRef.current = stream;

      // Audio level metering for visual feedback
      try {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const src = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        src.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setAudioLevel(sum / dataArray.length / 255);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Non-fatal: level metering is optional visual feedback
      }

      // Timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

      // Start native SpeechRecognition
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        transcriptAccRef.current = final;
        // Show live transcript (final + interim)
        setLastTranscript((final + " " + interim).trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("[Voice] Recognition error:", event.error);
        // "aborted" and "no-speech" are non-fatal
        if (event.error === "aborted" || event.error === "no-speech") return;
        cleanupRecording();
        onError?.(`Speech recognition error: ${event.error}`);
        updateState("idle");
      };

      recognition.onend = () => {
        // Only process if we're still in listening state (not cancelled)
        if (stateRef.current !== "listening") return;
        const transcript = transcriptAccRef.current.trim();
        cleanupRecording();

        if (transcript) {
          updateState("processing");
          processTranscript(transcript);
        } else {
          updateState("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      console.error("[Voice] Start error:", err);
      cleanupRecording();
      onError?.(err instanceof Error ? err.message : "Could not start listening");
      updateState("idle");
    }
  }, [updateState, tts, cleanupRecording, processTranscript, onError]);

  /** Stop listening — triggers processing chain via recognition.onend */
  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop(); // fires onend → processTranscript
    } catch {
      cleanupRecording();
      updateState("idle");
    }
  }, [cleanupRecording, updateState]);

  /** Cancel everything */
  const cancel = useCallback(() => {
    cleanupRecording();
    abortControllerRef.current?.abort();
    tts.stop();
    updateState("idle");
  }, [tts, updateState, cleanupRecording]);

  /** Toggle */
  const toggle = useCallback(() => {
    switch (stateRef.current) {
      case "idle": startListening(); break;
      case "listening": stopListening(); break;
      default: cancel(); break;
    }
  }, [startListening, stopListening, cancel]);

  /** Clear conversation */
  const clearHistory = useCallback(() => {
    conversationHistory.current = [];
    setLastTranscript("");
    setLastResponse("");
  }, []);

  useEffect(() => () => { cancel(); }, [cancel]);

  return {
    state,
    toggle,
    startListening,
    stopListening,
    cancel,
    clearHistory,
    lastTranscript,
    lastResponse,
    audioLevel,
    elapsed,
    isIdle: state === "idle",
    isListening: state === "listening",
    isProcessing: state === "processing",
    isThinking: state === "thinking",
    isSpeaking: state === "speaking",
    isActive: state !== "idle",
    voiceEngine: tts.currentEngine,
    setVoiceEngine: tts.setEngine,
  };
}
