/**
 * useVoiceSynthesis — Text-to-Speech for Hologram
 * ═══════════════════════════════════════════════
 * 
 * Two modes:
 *  1. Web Speech API (default) — free, instant, fully client-side
 *  2. ElevenLabs (premium)     — natural voices via edge function
 * 
 * The hook auto-detects if ElevenLabs is available and falls back gracefully.
 * All voice output is ephemeral — no audio is stored or transmitted beyond TTS.
 * 
 * @module hologram-ui/hooks/useVoiceSynthesis
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceEngine = "web-speech" | "elevenlabs";
export type VoiceSynthStatus = "idle" | "speaking" | "loading";

interface UseVoiceSynthesisOptions {
  engine?: VoiceEngine;
  /** ElevenLabs voice ID — defaults to "onwK4e9ZLuTAKqWW03F9" (Daniel, warm male) */
  voiceId?: string;
  /** Web Speech voice name preference */
  webVoiceName?: string;
  /** Speech rate for Web Speech API (0.5 - 2.0) */
  rate?: number;
  /** Speech pitch for Web Speech API (0 - 2) */
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

const ELEVENLABS_TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const SILENT_PRIMER_AUDIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export function useVoiceSynthesis({
  engine = "web-speech",
  voiceId = "onwK4e9ZLuTAKqWW03F9",
  webVoiceName,
  rate = 0.95,
  pitch = 1.0,
  onStart,
  onEnd,
  onError,
}: UseVoiceSynthesisOptions = {}) {
  const [status, setStatus] = useState<VoiceSynthStatus>("idle");
  const statusRef = useRef<VoiceSynthStatus>("idle");
  const [currentEngine, setCurrentEngine] = useState<VoiceEngine>(engine);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortRef = useRef(false);
  const playbackPrimedRef = useRef(false);

  const updateStatus = useCallback((s: VoiceSynthStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const revokeAudioUrl = useCallback(() => {
    if (!audioUrlRef.current) return;
    URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }, []);

  /** Prime audio output in direct user-gesture context (fixes autoplay gating on some browsers) */
  const primeForPlayback = useCallback(() => {
    if (playbackPrimedRef.current) return;

    playbackPrimedRef.current = true;
    const primer = audioRef.current ?? new Audio(SILENT_PRIMER_AUDIO);
    primer.muted = true;
    primer.volume = 0;
    primer.setAttribute("playsinline", "true");
    primer.preload = "auto";
    audioRef.current = primer;

    primer.play().then(() => {
      primer.pause();
      primer.currentTime = 0;
      primer.muted = false;
      primer.volume = 1;
    }).catch(() => {
      playbackPrimedRef.current = false;
      primer.muted = false;
      primer.volume = 1;
      if (audioRef.current === primer) audioRef.current = null;
    });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  /** Pick the best available Web Speech voice */
  const getWebVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (voices.length === 0) return null;

    // Try user preference first
    if (webVoiceName) {
      const match = voices.find(v => v.name.toLowerCase().includes(webVoiceName.toLowerCase()));
      if (match) return match;
    }

    // Prefer high-quality English voices
    const preferred = [
      "Google UK English Male",
      "Google UK English Female",
      "Daniel",
      "Samantha",
      "Alex",
      "Karen",
    ];

    for (const name of preferred) {
      const match = voices.find(v => v.name.includes(name));
      if (match) return match;
    }

    // Fall back to any English voice
    const english = voices.find(v => v.lang.startsWith("en"));
    return english || voices[0];
  }, [webVoiceName]);

  /** Speak via Web Speech API */
  const speakWebSpeech = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      onError?.("Web Speech API not supported in this browser");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getWebVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.85;

    utterance.onstart = () => {
      updateStatus("speaking");
      onStart?.();
    };

    utterance.onend = () => {
      updateStatus("idle");
      onEnd?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled") {
        updateStatus("idle");
        onError?.(e.error);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [getWebVoice, rate, pitch, onStart, onEnd, onError]);

  /** Speak via ElevenLabs edge function */
  const speakElevenLabs = useCallback(async (text: string) => {
    if (abortRef.current) return;

    updateStatus("loading");

    // Reuse a single audio element (once primed, browsers are less likely to gate playback)
    const audio = audioRef.current ?? new Audio();
    audio.setAttribute("playsinline", "true");
    audio.preload = "auto";
    audioRef.current = audio;

    try {
      const response = await fetch(ELEVENLABS_TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!response.ok) {
        // Fall back to Web Speech
        console.warn("[VoiceSynth] ElevenLabs unavailable, falling back to Web Speech");
        setCurrentEngine("web-speech");
        updateStatus("idle");
        speakWebSpeech(text);
        return;
      }

      const audioBlob = await response.blob();
      revokeAudioUrl();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      audio.src = audioUrl;

      audio.onplay = () => {
        updateStatus("speaking");
        onStart?.();
      };

      audio.onended = () => {
        updateStatus("idle");
        revokeAudioUrl();
        onEnd?.();
      };

      audio.onerror = () => {
        updateStatus("idle");
        revokeAudioUrl();
        onError?.("Audio playback failed");
      };

      if (abortRef.current) {
        updateStatus("idle");
        return;
      }

      await audio.play();
    } catch (err) {
      console.warn("[VoiceSynth] ElevenLabs error, falling back:", err);
      updateStatus("idle");
      revokeAudioUrl();
      setCurrentEngine("web-speech");
      speakWebSpeech(text);
    }
  }, [voiceId, speakWebSpeech, onStart, onEnd, onError, updateStatus, revokeAudioUrl]);

  /** Primary speak function — routes to the active engine */
  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    abortRef.current = false;

    // Clean up text for better TTS: strip markdown artifacts
    const clean = text
      .replace(/[*_`#>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

    if (currentEngine === "elevenlabs") {
      primeForPlayback();
      speakElevenLabs(clean);
    } else {
      speakWebSpeech(clean);
    }
  }, [currentEngine, primeForPlayback, speakElevenLabs, speakWebSpeech]);

  /** Stop all speech immediately */
  const stop = useCallback(() => {
    abortRef.current = true;
    
    // Stop Web Speech
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;

    // Stop ElevenLabs audio (keep element for future primed playback)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.removeAttribute("src");
    }
    revokeAudioUrl();

    updateStatus("idle");
  }, [revokeAudioUrl, updateStatus]);

  /** Toggle engine */
  const setEngine = useCallback((e: VoiceEngine) => {
    stop();
    setCurrentEngine(e);
  }, [stop]);

  return {
    speak,
    stop,
    primeForPlayback,
    status,
    statusRef,
    isSpeaking: status === "speaking",
    isLoading: status === "loading",
    currentEngine,
    setEngine,
  };
}
