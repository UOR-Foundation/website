/**
 * useVoiceConversation — Unified Voice Loop Orchestrator
 * ═══════════════════════════════════════════════════════
 *
 * Delegates STT to HologramSttEngine (privacy-aware).
 * States: idle → listening → processing → thinking → speaking → idle
 *
 * @module hologram-ui/hooks/useVoiceConversation
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useVoiceSynthesis, type VoiceEngine } from "./useVoiceSynthesis";
import { useAudioCapture } from "./useAudioCapture";
import { getHologramStt, type SttStrategy, type SttPrivacyLevel } from "@/modules/uns/core/hologram/stt-engine";

export type VoiceConversationState =
  | "idle"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking";

export type SttEngine = SttStrategy | "loading";

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
  onWhisperProgress?: (progress: { status: string; progress?: number }) => void;
}

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`;

const GREETINGS = [
  "I'm here. Take your time.",
  "Hello. I'm listening whenever you're ready.",
  "Present and listening. What's on your mind?",
  "I'm with you. Speak when it feels right.",
  "Here. No rush — I'm all ears.",
];

function classifyMicError(err: any): string {
  if (err?.name === "NotAllowedError") return "Microphone permission denied";
  if (err?.name === "NotFoundError") return "No microphone found";
  return "Could not access microphone";
}

// ── Hook ────────────────────────────────────────────────────────────────────

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
  const [sttEngine, setSttEngine] = useState<SttEngine>("loading");
  const [whisperProgress, setWhisperProgress] = useState(0);

  const conversationHistory = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const hasGreetedRef = useRef(false);
  const nativeHandleRef = useRef<{ stop: () => void; abort: () => void; getTranscript: () => string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stt = getHologramStt();

  const set = useCallback((s: VoiceConversationState) => {
    stateRef.current = s;
    setState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  const tts = useVoiceSynthesis({
    engine: voiceEngine,
    rate: 0.95,
    onError: (err) => { set("idle"); onError?.(`Voice output error: ${err}`); },
  });

  const autoStopRef = useRef<(() => void) | null>(null);

  const capture = useAudioCapture({
    silenceAutoStopSec: 1.5,
    onSilence: () => {
      if (stateRef.current === "listening") {
        autoStopRef.current?.();
      }
    },
    onLevel: setAudioLevel,
  });

  // ── Engine availability ─────────────────────────────────────────────
  useEffect(() => {
    const strategy = stt.autoSelect();
    setSttEngine(strategy);
    console.log(`[Voice] ${strategy} (privacy: ${stt.privacy})`);
  }, []);

  const cleanup = useCallback(() => {
    stt.abort();
    nativeHandleRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setAudioLevel(0);
  }, [stt]);

  // ── Lumen Stream ────────────────────────────────────────────────────

  const queryLumen = useCallback(async (userText: string): Promise<string> => {
    conversationHistory.current.push({ role: "user", content: userText });

    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch(STREAM_URL, {
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

    if (!res.ok || !res.body) throw new Error(`Lumen error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const c = JSON.parse(json).choices?.[0]?.delta?.content;
          if (c) { full += c; setLastResponse(full); }
        } catch { /* partial */ }
      }
    }

    conversationHistory.current.push({ role: "assistant", content: full });
    return full;
  }, [cloudModel, personaId, skillId, screenContext, observerBriefing, fusionContext]);

  // ── Process transcript → think → speak ──────────────────────────────

  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) { set("idle"); return; }
    setLastTranscript(transcript);

    try {
      set("thinking");
      setLastResponse("");
      const response = await queryLumen(transcript);
      if (!response.trim()) { set("idle"); return; }

      set("speaking");
      await tts.speak(response);
      set("idle");
      onExchange?.(transcript, response);
    } catch (err) {
      console.error("[Voice] Processing error:", err);
      onError?.(err instanceof Error ? err.message : "Voice conversation error");
      set("idle");
    }
  }, [set, queryLumen, tts, onExchange, onError]);

  // ── Start listening ─────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (stateRef.current !== "idle") return;

    // First activation: greet
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      set("speaking");
      setLastResponse(greeting);
      conversationHistory.current.push({ role: "assistant", content: greeting });
      await tts.speak(greeting);
      await new Promise(r => setTimeout(r, 200));
    }

    // Re-check strategy (Whisper may have loaded since init)
    const strategy = stt.autoSelect();
    setSttEngine(strategy);

    // Acquire mic + start AudioWorklet for level metering + VAD
    try {
      await capture.start();
    } catch (err) {
      onError?.(classifyMicError(err));
      set("idle");
      return;
    }

    // If native strategy, start continuous recognition in parallel
    if (strategy === "native" && stt.nativeAvailable) {
      nativeHandleRef.current = stt.startContinuousNative({
        onInterim: (text) => setLastTranscript(text),
        onError: (err) => {
          if (err !== "aborted" && err !== "no-speech") {
            capture.cancel();
            cleanup();
            onError?.(`Speech recognition error: ${err}`);
            set("idle");
          }
        },
        onEnd: (transcript) => {
          if (stateRef.current !== "listening") return;
          capture.cancel();
          cleanup();
          if (transcript) { set("processing"); processTranscript(transcript); }
          else set("idle");
        },
      });
    }

    // Timer
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    set("listening");
  }, [set, tts, cleanup, processTranscript, onError, capture, stt]);

  // ── Stop listening ──────────────────────────────────────────────────

  const stopListening = useCallback(async () => {
    if (stateRef.current !== "listening") return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    if (stt.activeStrategy === "whisper" && stt.whisperAvailable) {
      nativeHandleRef.current?.abort();
      const result = await capture.stop();
      if (!result) { set("idle"); return; }

      set("processing");
      setLastTranscript("Transcribing…");

      try {
        const transcription = await stt.transcribeWhisper(result.audio, result.sampleRate);
        if (transcription.text.trim()) await processTranscript(transcription.text);
        else set("idle");
      } catch {
        onError?.("Transcription failed — using native STT");
        stt.forceStrategy("native");
        setSttEngine("native");
        set("idle");
      }
    } else {
      // Native: stop triggers onend → processTranscript
      capture.cancel();
      nativeHandleRef.current?.stop();
    }
  }, [stt, capture, set, processTranscript, onError]);

  autoStopRef.current = stopListening;

  // ── Cancel / Toggle / Clear ─────────────────────────────────────────

  const cancel = useCallback(() => {
    capture.cancel();
    cleanup();
    abortRef.current?.abort();
    tts.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    set("idle");
  }, [capture, tts, set, cleanup]);

  const toggle = useCallback(() => {
    switch (stateRef.current) {
      case "idle": startListening(); break;
      case "listening": stopListening(); break;
      default: cancel(); break;
    }
  }, [startListening, stopListening, cancel]);

  const clearHistory = useCallback(() => {
    conversationHistory.current = [];
    setLastTranscript("");
    setLastResponse("");
  }, []);

  const injectContext = useCallback((messages: { role: "user" | "assistant"; content: string }[]) => {
    conversationHistory.current = [...messages];
  }, []);

  useEffect(() => () => { cancel(); }, [cancel]);

  return {
    state,
    toggle,
    startListening,
    stopListening,
    cancel,
    clearHistory,
    injectContext,
    lastTranscript,
    lastResponse,
    audioLevel,
    elapsed,
    sttEngine,
    privacy: stt.privacy as SttPrivacyLevel,
    privacyWarning: stt.privacyWarning,
    whisperProgress,
    conversationHistory: conversationHistory.current,
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
