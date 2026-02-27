/**
 * useVoiceConversation — Full Voice Loop Orchestrator
 * ════════════════════════════════════════════════════
 *
 * Chains: Whisper STT → Lumen AI Streaming → TTS
 *
 * States: idle → listening → processing → thinking → speaking → idle
 *
 * Key simplification: TTS.speak() returns a Promise, so greeting
 * and response playback are just `await tts.speak(text)`.
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

export function useVoiceConversation({
  voiceEngine = "elevenlabs",
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

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pipelineRef = useRef<any>(null);

  const updateState = useCallback((s: VoiceConversationState) => {
    stateRef.current = s;
    setState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  // TTS — callbacks only fire for non-greeting speech
  const tts = useVoiceSynthesis({
    engine: voiceEngine,
    rate: 0.95,
    onError: (err) => {
      updateState("idle");
      onError?.(`Voice output error: ${err}`);
    },
  });

  /** Lazy-load Whisper */
  const ensureWhisper = useCallback(async () => {
    if (pipelineRef.current) return pipelineRef.current;
    const { pipeline } = await import("@huggingface/transformers");
    const transcriber = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      { dtype: "q8", device: "wasm" },
    );
    pipelineRef.current = transcriber;
    return transcriber;
  }, []);

  /** Convert audio blob → Float32 PCM at 16kHz */
  const audioToFloat32 = useCallback(async (blob: Blob): Promise<Float32Array> => {
    const arrayBuf = await blob.arrayBuffer();
    const ctx = new OfflineAudioContext(1, 1, 16000);
    const decoded = await ctx.decodeAudioData(arrayBuf);
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start();
    const rendered = await offlineCtx.startRendering();
    return rendered.getChannelData(0);
  }, []);

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

  /** Clean up recording resources */
  const cleanupRecording = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  /** Start listening — the main entry point */
  const startListening = useCallback(async () => {
    if (stateRef.current !== "idle") return;

    try {
      // First activation: greet the user
      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        updateState("speaking");
        setLastResponse(greeting);
        conversationHistory.current.push({ role: "assistant", content: greeting });

        console.log("[Voice] Playing greeting:", greeting);
        await tts.speak(greeting);  // ← Promise resolves when audio ends

        console.log("[Voice] Greeting done, opening mic");
        await new Promise(r => setTimeout(r, 300)); // brief pause
      }

      updateState("listening");

      // Load Whisper in parallel with mic access
      const [, stream] = await Promise.all([
        ensureWhisper(),
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        }),
      ]);

      streamRef.current = stream;
      chunksRef.current = [];

      // Audio level metering
      const audioCtx = new AudioContext();
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

      // Timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cleanupRecording();

        if (chunksRef.current.length === 0) {
          updateState("idle");
          return;
        }

        // Transcribe
        updateState("processing");
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const pcm = await audioToFloat32(blob);
          const transcriber = await ensureWhisper();
          const result = await transcriber(pcm, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false,
          });

          const transcript = (result?.text ?? "").trim();
          if (!transcript) { updateState("idle"); return; }

          setLastTranscript(transcript);

          // Think
          updateState("thinking");
          setLastResponse("");
          const response = await queryLumen(transcript);

          if (!response.trim()) { updateState("idle"); return; }

          // Speak the response
          updateState("speaking");
          await tts.speak(response);
          updateState("idle");

          onExchange?.(transcript, response);
        } catch (err) {
          console.error("[Voice] Error:", err);
          onError?.(err instanceof Error ? err.message : "Voice conversation error");
          updateState("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
    } catch (err) {
      console.error("[Voice] Start error:", err);
      onError?.(err instanceof Error ? err.message : "Could not start listening");
      updateState("idle");
    }
  }, [updateState, ensureWhisper, audioToFloat32, queryLumen, tts, cleanupRecording, onExchange, onError]);

  /** Stop listening — triggers processing chain */
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  /** Cancel everything */
  const cancel = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
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
