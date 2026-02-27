/**
 * useHologramStt — Native-First Speech-to-Text for Hologram
 * ══════════════════════════════════════════════════════════
 *
 * Fully browser-native, zero-external-dependency STT using the
 * built-in SpeechRecognition API as the PRIMARY engine.
 *
 * Architecture:
 *   1. Native SpeechRecognition (primary) — instant, no downloads,
 *      runs entirely in the browser's speech engine
 *   2. Whisper ONNX (optional upgrade) — only if model is already
 *      cached in browser Cache API from a previous session
 *
 * AudioWorklet capture runs in parallel for:
 *   - Voiceprint derivation (privacy-preserving biometrics)
 *   - VAD silence detection (hands-free auto-stop)
 *   - Audio level metering (waveform UI)
 *
 * @module hologram-ui/hooks/useWhisperTranscription
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getWhisperEngine } from "@/modules/uns/core/hologram/whisper-engine";
import { isNativeSttAvailable, recognizeNative } from "@/modules/uns/core/hologram/native-stt";
import { useAudioCapture } from "@/modules/hologram-ui/hooks/useAudioCapture";

export type WhisperStatus =
  | "idle"           // Nothing happening
  | "loading"        // Checking engine availability
  | "ready"          // Engine available, waiting
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
  const [sttEngine, setSttEngine] = useState<"native" | "whisper">("native");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<WhisperStatus>("idle");
  const nativeRecRef = useRef<any>(null);
  const nativeTranscriptRef = useRef("");

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
      if (statusRef.current === "recording") {
        autoStopRef.current?.();
      }
    },
  });

  // ── Engine availability check (no preloading from CDN) ──────────────
  useEffect(() => {
    // Check if Whisper is already cached from a previous session
    const engine = getWhisperEngine();
    if (engine.isReady) {
      setSttEngine("whisper");
      updateStatus("ready");
      console.log("[HologramSTT] Whisper ONNX cached — using as primary engine");
      return;
    }

    // Default: use native SpeechRecognition (instant, no download)
    if (isNativeSttAvailable()) {
      setSttEngine("native");
      updateStatus("ready");
      console.log("[HologramSTT] Using native SpeechRecognition (browser-native, zero download)");
    } else {
      updateStatus("idle");
      console.warn("[HologramSTT] No STT engine available");
    }
  }, [updateStatus]);

  const startRecording = useCallback(async () => {
    try {
      updateStatus("recording");

      // Start AudioWorklet capture for level metering + VAD + voiceprint
      await capture.start();

      // If using native STT, also start SpeechRecognition in parallel
      if (sttEngine === "native" && isNativeSttAvailable()) {
        const w = window as any;
        const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (Ctor) {
          const recognition = new Ctor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          nativeTranscriptRef.current = "";

          recognition.onresult = (event: any) => {
            let final = "";
            for (let i = 0; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
              }
            }
            nativeTranscriptRef.current = final;
          };

          recognition.onerror = (event: any) => {
            if (event.error !== "aborted" && event.error !== "no-speech") {
              console.warn("[HologramSTT] Native STT error:", event.error);
            }
          };

          nativeRecRef.current = recognition;
          recognition.start();
        }
      }

      // Elapsed timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err) {
      console.error("[HologramSTT] Recording error:", err);
      updateStatus("ready");
    }
  }, [updateStatus, capture, sttEngine]);

  const stopRecording = useCallback(async () => {
    if (statusRef.current !== "recording") return;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    // Stop native recognition
    try { nativeRecRef.current?.stop(); } catch {}

    const result = await capture.stop();

    if (!result) {
      updateStatus("ready");
      return;
    }

    updateStatus("transcribing");

    try {
      if (sttEngine === "whisper") {
        // Whisper path (only if model was already cached)
        const engine = getWhisperEngine();
        if (engine.isReady) {
          const transcription = await engine.transcribe(result.audio, result.sampleRate);
          const text = transcription.text.trim();
          if (text) onTranscript(text);
          updateStatus("ready");
          return;
        }
      }

      // Native path: use accumulated transcript from SpeechRecognition
      const nativeText = nativeTranscriptRef.current.trim();
      if (nativeText) {
        onTranscript(nativeText);
      } else if (isNativeSttAvailable()) {
        // Fallback: run one-shot recognition
        try {
          const native = await recognizeNative({ timeoutMs: 6000 });
          if (native.text.trim()) onTranscript(native.text.trim());
        } catch (err) {
          console.warn("[HologramSTT] Native fallback failed:", err);
        }
      }
    } catch (err) {
      console.error("[HologramSTT] Transcription error:", err);
    }

    updateStatus("ready");
  }, [capture, onTranscript, updateStatus, sttEngine]);

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
      try { nativeRecRef.current?.abort(); } catch {}
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
    sttEngine,
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
