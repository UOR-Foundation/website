/**
 * useWhisperTranscription — Client-side Whisper STT via WhisperEngine
 * ═════════════════════════════════════════════════════════════════════
 *
 * Fully open-source, offline-capable voice-to-text using OpenAI Whisper
 * running in the browser via the unified WhisperEngine singleton, which
 * leverages the HologramGpu (vGPU) for constant-time WebGPU inference.
 *
 * Improvements over v1:
 *   - AudioWorklet capture (off main thread, zero jank)
 *   - Built-in VAD: auto-stops after 1.5s of silence
 *   - Idle-time Whisper warm-start via requestIdleCallback
 *   - Navigator permissions query for proactive mic status
 *
 * @module hologram-ui/hooks/useWhisperTranscription
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getWhisperEngine, preloadWhisper } from "@/modules/uns/core/hologram/whisper-engine";
import { useAudioCapture } from "@/modules/hologram-ui/hooks/useAudioCapture";

export type WhisperStatus =
  | "idle"           // Nothing happening
  | "loading"        // Model downloading / warming up
  | "ready"          // Model loaded, waiting
  | "recording"      // Actively capturing audio
  | "transcribing";  // Processing captured audio

interface UseWhisperOptions {
  onTranscript: (text: string) => void;
  onStatusChange?: (status: WhisperStatus) => void;
  /** Auto-stop recording after this many seconds of silence (default 1.5) */
  silenceAutoStopSec?: number;
}

export function useWhisperTranscription({
  onTranscript,
  onStatusChange,
  silenceAutoStopSec = 1.5,
}: UseWhisperOptions) {
  const [status, setStatus] = useState<WhisperStatus>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<WhisperStatus>("idle");

  const updateStatus = useCallback(
    (s: WhisperStatus) => {
      statusRef.current = s;
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange],
  );

  // Auto-stop callback — triggered by VAD when silence detected
  const autoStopRef = useRef<(() => void) | null>(null);

  const capture = useAudioCapture({
    silenceAutoStopSec,
    onSilence: () => {
      // Only auto-stop if we're recording
      if (statusRef.current === "recording") {
        autoStopRef.current?.();
      }
    },
  });

  // ── Idle-time Whisper warm-start ─────────────────────────────────────
  // Pre-load model during browser idle periods so first mic click is instant
  useEffect(() => {
    const engine = getWhisperEngine();
    if (engine.isReady) {
      updateStatus("ready");
      return;
    }

    const startPreload = () => {
      preloadWhisper((p) => {
        setLoadProgress(Math.round(p.progress ?? 0));
      });
    };

    // Use requestIdleCallback for non-blocking preload
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(() => startPreload(), { timeout: 5000 });
      // Poll for readiness
      const iv = setInterval(() => {
        const e = getWhisperEngine();
        if (e.isReady) { updateStatus("ready"); clearInterval(iv); }
        else if (e.status === "error") { clearInterval(iv); }
      }, 500);
      return () => { cancelIdleCallback(id); clearInterval(iv); };
    } else {
      // Fallback: start after short delay
      const to = setTimeout(startPreload, 1000);
      const iv = setInterval(() => {
        const e = getWhisperEngine();
        if (e.isReady) { updateStatus("ready"); clearInterval(iv); }
        else if (e.status === "error") { clearInterval(iv); }
      }, 500);
      return () => { clearTimeout(to); clearInterval(iv); };
    }
  }, [updateStatus]);

  const startRecording = useCallback(async () => {
    try {
      // Ensure model is loaded
      const engine = getWhisperEngine();
      if (!engine.isReady) {
        updateStatus("loading");
        await engine.load((p) => setLoadProgress(Math.round(p.progress ?? 0)));
      }
      updateStatus("recording");

      // Start AudioWorklet-based capture (user gesture preserved)
      await capture.start();

      // Elapsed timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err) {
      console.error("[useWhisperTranscription] Recording error:", err);
      updateStatus(getWhisperEngine().isReady ? "ready" : "idle");
    }
  }, [updateStatus, capture]);

  const stopRecording = useCallback(async () => {
    if (statusRef.current !== "recording") return;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const result = await capture.stop();

    if (!result) {
      updateStatus("ready");
      return;
    }

    updateStatus("transcribing");

    try {
      const transcription = await getWhisperEngine().transcribe(result.audio, result.sampleRate);
      const text = transcription.text.trim();
      if (text) onTranscript(text);
    } catch (err) {
      console.error("[useWhisperTranscription] Transcription error:", err);
    }

    updateStatus("ready");
  }, [capture, onTranscript, updateStatus]);

  // Wire up VAD auto-stop
  autoStopRef.current = stopRecording;

  const toggleRecording = useCallback(() => {
    if (statusRef.current === "recording") {
      stopRecording();
    } else if (statusRef.current === "idle" || statusRef.current === "ready") {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      capture.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [capture]);

  return {
    status,
    loadProgress,
    audioLevel: capture.audioLevel,
    elapsed,
    isRecording: status === "recording",
    isTranscribing: status === "transcribing",
    isLoading: status === "loading",
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
