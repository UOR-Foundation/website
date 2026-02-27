/**
 * useWhisperTranscription — Client-side Whisper STT via WhisperEngine
 * ═════════════════════════════════════════════════════════════════════
 *
 * Fully open-source, offline-capable voice-to-text using OpenAI Whisper
 * running in the browser via the unified WhisperEngine singleton, which
 * leverages the HologramGpu (vGPU) for constant-time WebGPU inference.
 *
 * This hook is the thin UI adapter for the Lumen AI chat's voice input.
 * All model management is delegated to WhisperEngine to avoid duplicate
 * pipelines and ensure consistent vGPU acceleration.
 *
 * - Press ⌘+Shift+V to toggle recording
 * - Audio is captured via ScriptProcessor, collected as Float32 PCM
 * - Transcribed by WhisperEngine (vGPU-accelerated)
 * - Result is returned via onTranscript callback
 *
 * @module hologram-ui/hooks/useWhisperTranscription
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getWhisperEngine, preloadWhisper } from "@/modules/uns/core/hologram/whisper-engine";

export type WhisperStatus =
  | "idle"           // Nothing happening
  | "loading"        // Model downloading / warming up
  | "ready"          // Model loaded, waiting
  | "recording"      // Actively capturing audio
  | "transcribing";  // Processing captured audio

interface UseWhisperOptions {
  onTranscript: (text: string) => void;
  onStatusChange?: (status: WhisperStatus) => void;
}

export function useWhisperTranscription({ onTranscript, onStatusChange }: UseWhisperOptions) {
  const [status, setStatus] = useState<WhisperStatus>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStatus = useCallback(
    (s: WhisperStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange],
  );

  // Pre-load WhisperEngine (vGPU-accelerated) in background on first mount
  useEffect(() => {
    const engine = getWhisperEngine();
    if (engine.isReady) {
      updateStatus("ready");
      return;
    }

    preloadWhisper((p) => {
      setLoadProgress(Math.round(p.progress ?? 0));
    });

    // Poll for readiness
    const iv = setInterval(() => {
      const e = getWhisperEngine();
      if (e.isReady) {
        updateStatus("ready");
        clearInterval(iv);
      } else if (e.status === "error") {
        console.warn("[useWhisperTranscription] WhisperEngine failed to load:", e.error);
        clearInterval(iv);
      }
    }, 500);

    return () => clearInterval(iv);
  }, [updateStatus]);

  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current?.state !== "closed") {
      audioCtxRef.current?.close().catch(() => {});
    }
    audioCtxRef.current = null;
    setAudioLevel(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Ensure model is loaded via WhisperEngine
      const engine = getWhisperEngine();
      if (!engine.isReady) {
        updateStatus("loading");
        await engine.load((p) => setLoadProgress(Math.round(p.progress ?? 0)));
      }
      updateStatus("recording");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up AudioContext + ScriptProcessor for raw PCM capture
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);

      // Audio level analyser
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

      // PCM capture via ScriptProcessor (same approach as VoiceOrb)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;

      // Elapsed timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err) {
      console.error("[useWhisperTranscription] Recording error:", err);
      updateStatus(getWhisperEngine().isReady ? "ready" : "idle");
    }
  }, [onTranscript, updateStatus, cleanup]);

  const stopRecording = useCallback(async () => {
    if (status !== "recording") return;

    const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    cleanup();

    if (!chunks.length) {
      updateStatus("ready");
      return;
    }

    // Merge PCM chunks
    const total = chunks.reduce((a, c) => a + c.length, 0);
    const merged = new Float32Array(total);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }

    // Skip very short recordings (< 0.3s)
    if (merged.length / sampleRate < 0.3) {
      updateStatus("ready");
      return;
    }

    updateStatus("transcribing");

    try {
      // Transcribe via WhisperEngine — uses vGPU if available
      const result = await getWhisperEngine().transcribe(merged, sampleRate);
      const text = result.text.trim();
      if (text) onTranscript(text);
    } catch (err) {
      console.error("[useWhisperTranscription] Transcription error:", err);
    }

    updateStatus("ready");
  }, [status, cleanup, onTranscript, updateStatus]);

  const toggleRecording = useCallback(() => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle" || status === "ready") {
      startRecording();
    }
  }, [status, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    loadProgress,
    audioLevel,
    elapsed,
    isRecording: status === "recording",
    isTranscribing: status === "transcribing",
    isLoading: status === "loading",
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
