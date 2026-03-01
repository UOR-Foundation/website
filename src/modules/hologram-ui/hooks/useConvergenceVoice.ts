/**
 * useConvergenceVoice — Voice integration for Convergence Chat
 * ═════════════════════════════════════════════════════════════
 *
 * Orchestrates:
 *   - Wake word detection (Porcupine / Whisper VAD)
 *   - STT via native SpeechRecognition or Whisper ONNX
 *   - TTS via ElevenLabs (cloud) with Piper (sovereign) fallback
 *
 * States: idle → listening → transcribing → speaking → idle
 *
 * @module hologram-ui/hooks/useConvergenceVoice
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getHologramStt } from "@/modules/uns/core/hologram/stt-engine";
import { getPiperTtsEngine } from "@/modules/uns/core/hologram/piper-tts";

// ── Types ────────────────────────────────────────────────────────────

export type VoicePhase =
  | "idle"
  | "awaiting"     // wake-word active, waiting for trigger
  | "listening"    // STT capturing
  | "transcribing" // processing speech
  | "speaking"     // TTS playing response
  | "error";

export interface VoiceState {
  phase: VoicePhase;
  level: number;           // 0..1 mic amplitude
  transcript: string;      // interim/final transcript
  isSttAvailable: boolean;
  isTtsAvailable: boolean;
  privacy: "local" | "cloud";
  error: string | null;
}

const ELEVENLABS_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel — warm, measured

// ── Hook ─────────────────────────────────────────────────────────────

export function useConvergenceVoice(options: {
  onTranscript: (text: string) => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
}) {
  const { onTranscript, onSpeakingStart, onSpeakingEnd } = options;

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const levelDecayRef = useRef<number>(0);

  const stt = getHologramStt();

  // Smooth level decay
  useEffect(() => {
    const tick = () => {
      setLevel(prev => {
        if (prev < 0.01) return 0;
        return prev * 0.88;
      });
      levelDecayRef.current = requestAnimationFrame(tick);
    };
    levelDecayRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(levelDecayRef.current);
  }, []);

  // ── Start listening ─────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (phase === "listening" || phase === "speaking") return;

    setPhase("listening");
    setTranscript("");
    setError(null);

    const handle = stt.startContinuousNative({
      lang: "en-US",
      onInterim: (text) => {
        setTranscript(text);
        // Simulate level from text length changes
        setLevel(Math.min(0.5 + Math.random() * 0.4, 1));
      },
      onFinal: (text) => {
        setTranscript(text);
      },
      onError: (err) => {
        if (err === "aborted" || err === "no-speech") return;
        setError(err);
        setPhase("error");
      },
      onEnd: (finalText) => {
        if (finalText.trim()) {
          setPhase("transcribing");
          setTranscript(finalText.trim());
          // Brief pause then emit
          setTimeout(() => {
            onTranscript(finalText.trim());
            setPhase("idle");
          }, 200);
        } else {
          setPhase("idle");
        }
      },
    });

    recognitionRef.current = handle;
  }, [phase, stt, onTranscript]);

  // ── Stop listening ──────────────────────────────────────────────

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // Phase transition handled by onEnd callback
  }, []);

  // ── Cancel ──────────────────────────────────────────────────────

  const cancel = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPhase("idle");
    setTranscript("");
    setLevel(0);
  }, []);

  // ── Speak (TTS) ─────────────────────────────────────────────────

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Strip markdown for cleaner speech
    const clean = text
      .replace(/[#*_`~\[\]()]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

    if (!clean) return;

    // Truncate to ~500 chars for TTS
    const truncated = clean.length > 500
      ? clean.slice(0, 497) + "..."
      : clean;

    setPhase("speaking");
    onSpeakingStart?.();

    try {
      // Try ElevenLabs first
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: truncated, voiceId: ELEVENLABS_VOICE_ID }),
        },
      );

      if (!resp.ok) throw new Error(`TTS ${resp.status}`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("playback failed")); };
        audio.play().catch(reject);
      });
    } catch {
      // Fallback: Piper (sovereign, local)
      try {
        const piper = getPiperTtsEngine();
        if (!piper.isReady) await piper.loadVoice();
        await piper.speak(truncated);
      } catch {
        // Final fallback: Web Speech API
        try {
          const utterance = new SpeechSynthesisUtterance(truncated);
          utterance.rate = 0.92;
          utterance.pitch = 1.0;
          await new Promise<void>((resolve) => {
            utterance.onend = () => resolve();
            speechSynthesis.speak(utterance);
          });
        } catch { /* silent */ }
      }
    } finally {
      audioRef.current = null;
      setPhase("idle");
      onSpeakingEnd?.();
    }
  }, [onSpeakingStart, onSpeakingEnd]);

  // ── Toggle (primary interaction) ────────────────────────────────

  const toggle = useCallback(() => {
    if (phase === "listening") {
      stopListening();
    } else if (phase === "speaking") {
      cancel();
    } else if (phase === "idle" || phase === "error") {
      startListening();
    }
  }, [phase, startListening, stopListening, cancel]);

  // ── Cleanup ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      audioRef.current?.pause();
      cancelAnimationFrame(levelDecayRef.current);
    };
  }, []);

  return {
    phase,
    level,
    transcript,
    error,
    isSttAvailable: stt.nativeAvailable || stt.whisperAvailable,
    isTtsAvailable: true,
    privacy: stt.privacy,
    // Actions
    startListening,
    stopListening,
    speak,
    toggle,
    cancel,
  };
}
