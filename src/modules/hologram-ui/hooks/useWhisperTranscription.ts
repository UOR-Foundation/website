/**
 * useHologramStt — Unified STT Hook for Hologram
 * ════════════════════════════════════════════════
 *
 * Delegates all STT logic to HologramSttEngine singleton.
 * AudioWorklet capture runs in parallel for VAD, level metering, voiceprint.
 *
 * Privacy-aware: exposes `privacy` field ("local" | "cloud") so UI
 * can inform the user when audio leaves the device.
 *
 * @module hologram-ui/hooks/useWhisperTranscription
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getHologramStt } from "@/modules/uns/core/hologram/stt-engine";
import { useAudioCapture } from "@/modules/hologram-ui/hooks/useAudioCapture";

export type WhisperStatus =
  | "idle"
  | "loading"
  | "ready"
  | "recording"
  | "transcribing";

interface UseWhisperOptions {
  onTranscript: (text: string) => void;
  onStatusChange?: (status: WhisperStatus) => void;
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
  const nativeHandleRef = useRef<{ stop: () => void; abort: () => void; getTranscript: () => string } | null>(null);

  const stt = getHologramStt();

  const updateStatus = useCallback(
    (s: WhisperStatus) => {
      statusRef.current = s;
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange],
  );

  const autoStopRef = useRef<(() => void) | null>(null);

  const capture = useAudioCapture({
    silenceAutoStopSec,
    onSilence: () => {
      if (statusRef.current === "recording") {
        autoStopRef.current?.();
      }
    },
  });

  // ── Engine availability ──────────────────────────────────────────────
  useEffect(() => {
    stt.autoSelect();
    updateStatus("ready");
    console.log(`[HologramSTT] ${stt.activeStrategy} (privacy: ${stt.privacy})`);
  }, [updateStatus]);

  const startRecording = useCallback(async () => {
    try {
      updateStatus("recording");
      await capture.start();

      // If native strategy, start continuous recognition in parallel
      if (stt.activeStrategy === "native" && stt.nativeAvailable) {
        nativeHandleRef.current = stt.startContinuousNative({
          onError: (err) => console.warn("[HologramSTT] Native error:", err),
        });
      }

      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err) {
      console.error("[HologramSTT] Recording error:", err);
      updateStatus("ready");
    }
  }, [updateStatus, capture, stt]);

  const stopRecording = useCallback(async () => {
    if (statusRef.current !== "recording") return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    nativeHandleRef.current?.stop();
    const result = await capture.stop();

    if (!result) { updateStatus("ready"); return; }

    updateStatus("transcribing");

    try {
      if (stt.activeStrategy === "whisper" && stt.whisperAvailable) {
        const transcription = await stt.transcribeWhisper(result.audio, result.sampleRate);
        if (transcription.text.trim()) onTranscript(transcription.text.trim());
      } else {
        // Use accumulated native transcript
        const nativeText = nativeHandleRef.current?.getTranscript()?.trim();
        if (nativeText) {
          onTranscript(nativeText);
        } else {
          // One-shot fallback
          try {
            const oneShot = await stt.recognizeOneShotNative({ timeoutMs: 6000 });
            if (oneShot.text.trim()) onTranscript(oneShot.text.trim());
          } catch (err) {
            console.warn("[HologramSTT] One-shot fallback failed:", err);
          }
        }
      }
    } catch (err) {
      console.error("[HologramSTT] Transcription error:", err);
    }

    nativeHandleRef.current = null;
    updateStatus("ready");
  }, [capture, onTranscript, updateStatus, stt]);

  autoStopRef.current = stopRecording;

  const toggleRecording = useCallback(() => {
    if (statusRef.current === "recording") stopRecording();
    else if (statusRef.current === "idle" || statusRef.current === "ready") startRecording();
  }, [startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      stt.abort();
      capture.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [capture, stt]);

  return {
    status,
    loadProgress,
    audioLevel: capture.audioLevel,
    elapsed,
    isRecording: status === "recording",
    isTranscribing: status === "transcribing",
    isLoading: status === "loading",
    sttEngine: stt.activeStrategy,
    privacy: stt.privacy,
    privacyWarning: stt.privacyWarning,
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
