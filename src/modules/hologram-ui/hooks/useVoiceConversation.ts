/**
 * useVoiceConversation — Full Voice Loop Orchestrator
 * ════════════════════════════════════════════════════
 *
 * Hybrid STT strategy:
 *   1. Whisper ONNX (via vGPU) — high-quality, cached after first load
 *   2. Native SpeechRecognition — instant fallback while Whisper loads
 *
 * Chains: Whisper/Native STT → Lumen AI Streaming → TTS
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
  const conversationHistory = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasGreetedRef = useRef(false);

  // Native STT refs
  const recognitionRef = useRef<any>(null);
  const transcriptAccRef = useRef("");

  // Whisper recording refs
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
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

  // ── Preload Whisper in background on mount ──────────────────────────────
  useEffect(() => {
    const engine = getWhisperEngine();
    if (engine.isReady) {
      setSttEngine("whisper");
      return;
    }

    preloadWhisper((p) => {
      const pct = p.progress ?? 0;
      setWhisperProgress(Math.round(pct));
      onWhisperProgress?.(p);
    });

    // Poll for readiness
    const interval = setInterval(() => {
      if (engine.isReady) {
        setSttEngine("whisper");
        clearInterval(interval);
        console.log("[Voice] 🎤 Whisper ready — switching to high-quality STT");
      } else if (engine.status === "error") {
        setSttEngine("native");
        clearInterval(interval);
        console.log("[Voice] Whisper load failed, using native STT");
      }
    }, 500);

    // Start with native if Whisper isn't ready yet
    const timeout = setTimeout(() => {
      if (!engine.isReady && sttEngine === "loading") {
        setSttEngine("native");
        console.log("[Voice] Using native STT while Whisper loads...");
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Stop native recognition
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;

    // Stop processor
    processorRef.current?.disconnect();
    processorRef.current = null;

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

  // ── Whisper-based listening ─────────────────────────────────────────────

  const startWhisperListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);

      // Audio level metering
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const meterTick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setAudioLevel(sum / dataArray.length / 255);
        rafRef.current = requestAnimationFrame(meterTick);
      };
      rafRef.current = requestAnimationFrame(meterTick);

      // Record raw PCM
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;

      // Timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

      updateState("listening");
    } catch (micErr: any) {
      if (micErr?.name === "NotAllowedError") {
        onError?.("Microphone permission denied");
      } else if (micErr?.name === "NotFoundError") {
        onError?.("No microphone found");
      } else {
        onError?.("Could not access microphone");
      }
      updateState("idle");
    }
  }, [updateState, onError]);

  const stopWhisperListening = useCallback(async () => {
    const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
    cleanupRecording();

    const chunks = chunksRef.current;
    chunksRef.current = [];

    if (!chunks.length) {
      updateState("idle");
      return;
    }

    // Merge chunks
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Skip very short recordings
    if (merged.length / sampleRate < 0.3) {
      updateState("idle");
      return;
    }

    updateState("processing");
    setLastTranscript("Transcribing…");

    try {
      const engine = getWhisperEngine();
      const result = await engine.transcribe(merged, sampleRate);

      if (result.text.trim()) {
        await processTranscript(result.text);
      } else {
        updateState("idle");
      }
    } catch (err) {
      console.error("[Voice] Whisper transcription error:", err);
      onError?.("Transcription failed — retrying with native STT");
      // Fall back to native for this session
      setSttEngine("native");
      updateState("idle");
    }
  }, [cleanupRecording, updateState, processTranscript, onError]);

  // ── Native STT listening (fallback) ─────────────────────────────────────

  const startNativeListening = useCallback(async () => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      onError?.("Speech recognition not supported. Please use Chrome, Safari, or Edge.");
      return;
    }

    try {
      // Get mic for audio level metering
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

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
      } catch { /* non-fatal */ }

      // Timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

      // Start recognition
      transcriptAccRef.current = "";
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
          if (result.isFinal) final += result[0].transcript;
          else interim += result[0].transcript;
        }
        transcriptAccRef.current = final;
        setLastTranscript((final + " " + interim).trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "aborted" || event.error === "no-speech") return;
        cleanupRecording();
        onError?.(`Speech recognition error: ${event.error}`);
        updateState("idle");
      };

      recognition.onend = () => {
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
      updateState("listening");

    } catch (micErr: any) {
      cleanupRecording();
      if (micErr?.name === "NotAllowedError") onError?.("Microphone permission denied");
      else if (micErr?.name === "NotFoundError") onError?.("No microphone found");
      else onError?.("Could not access microphone");
      updateState("idle");
    }
  }, [updateState, cleanupRecording, processTranscript, onError]);

  // ── Public API ──────────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (stateRef.current !== "idle") return;

    // First activation: greet
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      updateState("speaking");
      setLastResponse(greeting);
      conversationHistory.current.push({ role: "assistant", content: greeting });
      await tts.speak(greeting);
      await new Promise(r => setTimeout(r, 300));
    }

    const engine = getWhisperEngine();
    if (engine.isReady) {
      setSttEngine("whisper");
      await startWhisperListening();
    } else {
      setSttEngine("native");
      await startNativeListening();
    }
  }, [updateState, tts, startWhisperListening, startNativeListening]);

  const stopListening = useCallback(async () => {
    if (stateRef.current !== "listening") return;

    const engine = getWhisperEngine();
    if (engine.isReady && sttEngine === "whisper") {
      await stopWhisperListening();
    } else {
      // Native: stop recognition (fires onend → processTranscript)
      try { recognitionRef.current?.stop(); } catch {
        cleanupRecording();
        updateState("idle");
      }
    }
  }, [sttEngine, stopWhisperListening, cleanupRecording, updateState]);

  const cancel = useCallback(() => {
    cleanupRecording();
    chunksRef.current = [];
    abortControllerRef.current?.abort();
    tts.stop();
    updateState("idle");
  }, [tts, updateState, cleanupRecording]);

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
    sttEngine,
    whisperProgress,
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
