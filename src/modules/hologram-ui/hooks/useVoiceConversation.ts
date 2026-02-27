/**
 * useVoiceConversation — Full Voice Loop Orchestrator
 * ════════════════════════════════════════════════════
 *
 * Chains: Whisper STT → Lumen AI Streaming → TTS (Web Speech / ElevenLabs)
 * 
 * This is the "Human ↔ Hologram" voice bridge.
 * - All transcripts are ephemeral (never stored unencrypted)
 * - Uses existing Lumen AI edge function for reasoning
 * - Falls back gracefully at every stage
 *
 * States: idle → listening → thinking → speaking → idle
 *
 * @module hologram-ui/hooks/useVoiceConversation
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useVoiceSynthesis, type VoiceEngine } from "./useVoiceSynthesis";

export type VoiceConversationState =
  | "idle"
  | "listening"     // Whisper is recording
  | "processing"    // Transcribing audio
  | "thinking"      // Waiting for Lumen AI
  | "speaking";     // TTS is outputting

interface UseVoiceConversationOptions {
  /** Voice engine: "web-speech" (free) or "elevenlabs" (premium) */
  voiceEngine?: VoiceEngine;
  /** Agent persona ID for Lumen AI */
  personaId?: string;
  /** Skill mode for Lumen AI */
  skillId?: string;
  /** Cloud model to use */
  cloudModel?: string;
  /** Screen context for ambient awareness */
  screenContext?: string;
  /** Observer briefing for ambient awareness */
  observerBriefing?: string;
  /** Fusion context (holographic context surface) */
  fusionContext?: string;
  /** Called when a full exchange completes (for conversation history) */
  onExchange?: (userText: string, assistantText: string) => void;
  /** Called on state changes */
  onStateChange?: (state: VoiceConversationState) => void;
  /** Called on errors */
  onError?: (error: string) => void;
}

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`;

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
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const conversationHistory = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasGreetedRef = useRef(false);

  // Recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Whisper pipeline (reuse singleton)
  const pipelineRef = useRef<any>(null);

  const updateState = useCallback((s: VoiceConversationState) => {
    setState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  // TTS output
  const tts = useVoiceSynthesis({
    engine: voiceEngine,
    rate: 0.95,
    onStart: () => updateState("speaking"),
    onEnd: () => updateState("idle"),
    onError: (err) => {
      updateState("idle");
      onError?.(`Voice output error: ${err}`);
    },
  });

  /** Load Whisper pipeline (lazy) */
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

  /** Convert audio blob to Float32 PCM at 16kHz */
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

  /** Send to Lumen AI and get streaming response */
  const queryLumen = useCallback(async (userText: string): Promise<string> => {
    conversationHistory.current.push({ role: "user", content: userText });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const messages = conversationHistory.current.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch(STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages,
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

    // Read full streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
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
        } catch {
          // Partial JSON, wait for more data
        }
      }
    }

    conversationHistory.current.push({ role: "assistant", content: fullText });
    return fullText;
  }, [cloudModel, personaId, skillId, screenContext, observerBriefing, fusionContext]);

  /** Warm greetings — gentle, balanced, human-first */
  const GREETINGS = [
    "I'm here. Take your time.",
    "Hello. I'm listening whenever you're ready.",
    "Present and listening. What's on your mind?",
    "I'm with you. Speak when it feels right.",
    "Here. No rush — I'm all ears.",
  ];

  /** Start listening — begins the voice loop */
  const startListening = useCallback(async () => {
    if (state !== "idle") return;

    try {
      // On first activation, greet the user warmly before listening
      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        updateState("speaking");
        setLastResponse(greeting);
        conversationHistory.current.push({ role: "assistant", content: greeting });

        // Speak the greeting and wait for TTS to finish
        await new Promise<void>((resolve) => {
          tts.speak(greeting);
          setTimeout(resolve, 4000);
        });

        // Small breath before listening
        await new Promise(r => setTimeout(r, 400));
      }

      updateState("listening");

      // Ensure Whisper is loaded
      await ensureWhisper();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Audio level metering
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
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
        // Clean up recording resources
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        analyserRef.current = null;
        setAudioLevel(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          updateState("idle");
          return;
        }

        // Phase 2: Transcribe
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
          if (!transcript) {
            updateState("idle");
            return;
          }

          setLastTranscript(transcript);

          // Phase 3: Think (Lumen AI)
          updateState("thinking");
          setLastResponse("");
          const response = await queryLumen(transcript);

          if (!response.trim()) {
            updateState("idle");
            return;
          }

          // Phase 4: Speak (TTS)
          tts.speak(response);

          // Notify parent
          onExchange?.(transcript, response);

        } catch (err) {
          console.error("[VoiceConversation] Error:", err);
          onError?.(err instanceof Error ? err.message : "Voice conversation error");
          updateState("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
    } catch (err) {
      console.error("[VoiceConversation] Start error:", err);
      onError?.(err instanceof Error ? err.message : "Could not start listening");
      updateState("idle");
    }
  }, [state, updateState, ensureWhisper, audioToFloat32, queryLumen, tts, onExchange, onError]);

  /** Stop listening — triggers the processing chain */
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  /** Cancel everything */
  const cancel = useCallback(() => {
    // Stop recording
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    // Stop audio metering
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    // Stop AI request
    abortControllerRef.current?.abort();
    // Stop TTS
    tts.stop();
    setAudioLevel(0);
    updateState("idle");
  }, [tts, updateState]);

  /** Toggle: start listening if idle, stop listening if listening, cancel if thinking/speaking */
  const toggle = useCallback(() => {
    switch (state) {
      case "idle":
        startListening();
        break;
      case "listening":
        stopListening();
        break;
      case "processing":
      case "thinking":
      case "speaking":
        cancel();
        break;
    }
  }, [state, startListening, stopListening, cancel]);

  /** Clear conversation history */
  const clearHistory = useCallback(() => {
    conversationHistory.current = [];
    setLastTranscript("");
    setLastResponse("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

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
