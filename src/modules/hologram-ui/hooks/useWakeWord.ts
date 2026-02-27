/**
 * useWakeWord — Pluggable Wake Word Detection Hook
 * ═════════════════════════════════════════════════
 *
 * Auto-selects the best wake word engine:
 *   1. Porcupine (if AccessKey available) — <20ms, ~1MB WASM
 *   2. Whisper VAD (sovereign fallback)   — ~2-3s, no API keys
 *
 * The detected wake word triggers `onWake()` which activates
 * the Whisper STT → Lumen AI → Piper TTS voice pipeline.
 *
 * @module hologram-ui/hooks/useWakeWord
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  createWakeWordEngine,
  type IWakeWordEngine,
  type WakeWordStatus,
  type WakeWordBackend,
  type WakeWordDetection,
} from "@/modules/uns/core/hologram/wake-word";
import { supabase } from "@/integrations/supabase/client";

export type { WakeWordStatus } from "@/modules/uns/core/hologram/wake-word";

interface UseWakeWordOptions {
  /** Callback when wake word is detected */
  onWake: () => void;
  /** The wake phrase (for Whisper VAD fallback) */
  wakePhrase?: string;
  /** Whether wake word detection is enabled */
  enabled?: boolean;
  /** Force a specific backend */
  forceBackend?: "porcupine" | "whisper-vad";
  /** Porcupine keywords (built-in or custom) */
  porcupineKeywords?: Array<
    | { builtin: string; sensitivity?: number }
    | { base64: string; label: string; sensitivity?: number }
  >;
}

/** Play a short ascending chime on wake detection */
function playWakeChime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {}
}

/** Fetch Picovoice AccessKey from edge function */
async function fetchPorcupineAccessKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("picovoice-access-key");
    if (error || !data?.accessKey) return null;
    return data.accessKey;
  } catch {
    return null;
  }
}

export function useWakeWord({
  onWake,
  wakePhrase = "hey lumen",
  enabled = false,
  forceBackend,
  porcupineKeywords,
}: UseWakeWordOptions) {
  const [status, setStatus] = useState<WakeWordStatus>("off");
  const [audioLevel, setAudioLevel] = useState(0);
  const [wakeDetected, setWakeDetected] = useState(false);
  const [activeBackend, setActiveBackend] = useState<WakeWordBackend | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const engineRef = useRef<IWakeWordEngine | null>(null);
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  const stopListening = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.stop();
    }
    setStatus("off");
    setAudioLevel(0);
  }, []);

  const startListening = useCallback(async () => {
    if (engineRef.current?.status !== "off") return;

    // If engine isn't ready, initialize it
    if (!engineRef.current.isReady) {
      const ok = await engineRef.current.init({
        onDetection: (detection: WakeWordDetection) => {
          console.log(`[useWakeWord] 🎯 ${detection.backend}: "${detection.keyword}"`);
          playWakeChime();
          setWakeDetected(true);
          setTimeout(() => setWakeDetected(false), 400);
          onWakeRef.current();
        },
        onStatusChange: (s) => setStatus(s),
        onError: (err) => {
          console.error("[useWakeWord]", err);
          setInitError(err);
        },
        onAudioLevel: (level) => setAudioLevel(level),
      });
      if (!ok) return;
    }

    await engineRef.current.start();
  }, []);

  // Initialize engine when enabled changes
  useEffect(() => {
    if (!enabled) {
      stopListening();
      return;
    }

    let cancelled = false;

    (async () => {
      // Fetch Porcupine access key
      const accessKey = forceBackend === "whisper-vad" ? null : await fetchPorcupineAccessKey();

      if (cancelled) return;

      // Create engine with auto-selection
      const engine = createWakeWordEngine({
        accessKey: accessKey ?? undefined,
        porcupineKeywords: porcupineKeywords as any,
        whisperConfig: { wakePhrase },
        forceBackend,
      });

      engineRef.current = engine;
      setActiveBackend(engine.backend);
      setInitError(null);

      // Init and start
      const ok = await engine.init({
        onDetection: (detection: WakeWordDetection) => {
          console.log(`[useWakeWord] 🎯 ${detection.backend}: "${detection.keyword}"`);
          playWakeChime();
          setWakeDetected(true);
          setTimeout(() => setWakeDetected(false), 400);
          onWakeRef.current();
        },
        onStatusChange: (s) => { if (!cancelled) setStatus(s); },
        onError: (err) => {
          console.error("[useWakeWord]", err);
          if (!cancelled) setInitError(err);
        },
        onAudioLevel: (level) => { if (!cancelled) setAudioLevel(level); },
      });

      if (ok && !cancelled) {
        await engine.start();
      }
    })();

    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [enabled, forceBackend, wakePhrase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    if (status !== "off") stopListening();
    else startListening();
  }, [status, startListening, stopListening]);

  return {
    status,
    audioLevel,
    isActive: status !== "off",
    isStandby: status === "standby",
    isDetecting: status === "detecting",
    isChecking: status === "checking",
    wakeDetected,
    activeBackend,
    initError,
    toggle,
    startListening,
    stopListening,
  };
}
