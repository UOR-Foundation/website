/**
 * useVoiceConversation — Unified Voice Loop Orchestrator
 * ═══════════════════════════════════════════════════════
 *
 * Single-entity voice interface for Lumen AI:
 *   Whisper ONNX (vGPU) → Lumen AI Stream → TTS
 *   Native STT fallback while Whisper loads
 *
 * All spoken exchanges are kept in persistent conversation context.
 *
 * States: idle → listening → processing → thinking → speaking → idle
 *
 * @module hologram-ui/hooks/useVoiceConversation
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useVoiceSynthesis, type VoiceEngine } from "./useVoiceSynthesis";
import { getWhisperEngine, preloadWhisper, type WhisperLoadProgress } from "@/modules/uns/core/hologram/whisper-engine";

export type VoiceConversationState =
  | "idle"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking";

export type SttEngine = "whisper" | "native" | "loading";

interface UseVoiceConversationOptions {
  voiceEngine?: VoiceEngine;
  personaId?: string;
  skillId?: string;
  cloudModel?: string;
  screenContext?: string;
  observerBriefing?: string;
  fusionContext?: string;
  /** Called after each exchange — wire to Lumen AI chat for context persistence */
  onExchange?: (userText: string, assistantText: string) => void;
  onStateChange?: (state: VoiceConversationState) => void;
  onError?: (error: string) => void;
  onWhisperProgress?: (progress: WhisperLoadProgress) => void;
}

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`;

const GREETINGS = [
  "I'm here. Take your time.",
  "Hello. I'm listening whenever you're ready.",
  "Present and listening. What's on your mind?",
  "I'm with you. Speak when it feels right.",
  "Here. No rush — I'm all ears.",
];

function getSpeechRecognition() {
  const w = window as any;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => any) | null;
}

// ── Shared mic capture ──────────────────────────────────────────────────────

interface MicCapture {
  stream: MediaStream;
  audioCtx: AudioContext;
  analyser: AnalyserNode;
  stopMetering: () => void;
}

/** Acquire mic, set up audio level metering. One function, no duplication. */
async function acquireMic(
  onLevel: (level: number) => void,
): Promise<MicCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.4;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf: number | null = null;
  const tick = () => {
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    onLevel(sum / data.length / 255);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stream,
    audioCtx,
    analyser,
    stopMetering: () => { if (raf) cancelAnimationFrame(raf); },
  };
}

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
  onWhisperProgress,
}: UseVoiceConversationOptions = {}) {
  const [state, setState] = useState<VoiceConversationState>("idle");
  const stateRef = useRef<VoiceConversationState>("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [sttEngine, setSttEngine] = useState<SttEngine>("loading");
  const [whisperProgress, setWhisperProgress] = useState(0);

  // Persistent conversation context — survives across exchanges
  const conversationHistory = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const hasGreetedRef = useRef(false);

  // Active capture refs
  const captureRef = useRef<MicCapture | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptAccRef = useRef("");
  const chunksRef = useRef<Float32Array[]>([]);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── Preload Whisper ─────────────────────────────────────────────────────

  useEffect(() => {
    const engine = getWhisperEngine();
    if (engine.isReady) { setSttEngine("whisper"); return; }

    preloadWhisper((p) => {
      setWhisperProgress(Math.round(p.progress ?? 0));
      onWhisperProgress?.(p);
    });

    const iv = setInterval(() => {
      if (engine.isReady) { setSttEngine("whisper"); clearInterval(iv); }
      else if (engine.status === "error") { setSttEngine("native"); clearInterval(iv); }
    }, 500);

    const to = setTimeout(() => {
      if (!engine.isReady) setSttEngine((prev) => prev === "loading" ? "native" : prev);
    }, 3000);

    return () => { clearInterval(iv); clearTimeout(to); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ─────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;

    processorRef.current?.disconnect();
    processorRef.current = null;

    captureRef.current?.stopMetering();
    captureRef.current?.stream.getTracks().forEach(t => t.stop());
    if (captureRef.current?.audioCtx.state !== "closed") {
      void captureRef.current?.audioCtx.close();
    }
    captureRef.current = null;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setAudioLevel(0);
  }, []);

  // ── Lumen AI Stream ─────────────────────────────────────────────────────

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

    if (!res.ok || !res.body) throw new Error(`Lumen AI error: ${res.status}`);

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

  // ── Process transcript → think → speak ──────────────────────────────────

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

  // ── Start listening (unified mic setup) ─────────────────────────────────

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

    // Acquire mic (shared for both engines)
    let capture: MicCapture;
    try {
      capture = await acquireMic(setAudioLevel);
    } catch (err) {
      onError?.(classifyMicError(err));
      set("idle");
      return;
    }
    captureRef.current = capture;

    // Timer
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    const engine = getWhisperEngine();
    const useWhisper = engine.isReady;
    setSttEngine(useWhisper ? "whisper" : "native");

    if (useWhisper) {
      // ── Whisper path: record raw PCM ──
      chunksRef.current = [];
      const processor = capture.audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      const source = capture.audioCtx.createMediaStreamSource(capture.stream);
      source.connect(processor);
      processor.connect(capture.audioCtx.destination);
      processorRef.current = processor;
      set("listening");
    } else {
      // ── Native STT path ──
      const SpeechRec = getSpeechRecognition();
      if (!SpeechRec) {
        cleanup();
        onError?.("Speech recognition not supported. Use Chrome, Safari, or Edge.");
        set("idle");
        return;
      }

      transcriptAccRef.current = "";
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "", final = "";
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        transcriptAccRef.current = final;
        setLastTranscript((final + " " + interim).trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "aborted" || event.error === "no-speech") return;
        cleanup();
        onError?.(`Speech recognition error: ${event.error}`);
        set("idle");
      };

      recognition.onend = () => {
        if (stateRef.current !== "listening") return;
        const transcript = transcriptAccRef.current.trim();
        cleanup();
        if (transcript) { set("processing"); processTranscript(transcript); }
        else set("idle");
      };

      recognitionRef.current = recognition;
      recognition.start();
      set("listening");
    }
  }, [set, tts, cleanup, processTranscript, onError]);

  // ── Stop listening ──────────────────────────────────────────────────────

  const stopListening = useCallback(async () => {
    if (stateRef.current !== "listening") return;

    if (sttEngine === "whisper") {
      const sampleRate = captureRef.current?.audioCtx.sampleRate ?? 44100;
      cleanup();

      const chunks = chunksRef.current;
      chunksRef.current = [];
      if (!chunks.length) { set("idle"); return; }

      // Merge PCM chunks
      const total = chunks.reduce((a, c) => a + c.length, 0);
      const merged = new Float32Array(total);
      let off = 0;
      for (const c of chunks) { merged.set(c, off); off += c.length; }

      if (merged.length / sampleRate < 0.3) { set("idle"); return; }

      set("processing");
      setLastTranscript("Transcribing…");

      try {
        const result = await getWhisperEngine().transcribe(merged, sampleRate);
        if (result.text.trim()) await processTranscript(result.text);
        else set("idle");
      } catch {
        onError?.("Transcription failed — falling back to native STT");
        setSttEngine("native");
        set("idle");
      }
    } else {
      // Native: stop triggers onend → processTranscript
      try { recognitionRef.current?.stop(); }
      catch { cleanup(); set("idle"); }
    }
  }, [sttEngine, cleanup, set, processTranscript, onError]);

  // ── Cancel / Toggle / Clear ─────────────────────────────────────────────

  const cancel = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    abortRef.current?.abort();
    tts.stop();
    set("idle");
  }, [tts, set, cleanup]);

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

  /** Inject external context (e.g., from Lumen AI chat) into voice memory */
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
