/**
 * useVoiceSynthesis — Text-to-Speech for Hologram
 * ═══════════════════════════════════════════════
 *
 * Two engines:
 *  1. Web Speech API (free, instant, client-side)
 *  2. ElevenLabs (premium, natural voices via edge function)
 *
 * Key design: `speak()` returns a Promise that resolves when speech ends.
 * This eliminates polling and callback spaghetti.
 *
 * @module hologram-ui/hooks/useVoiceSynthesis
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceEngine = "web-speech" | "elevenlabs";
export type VoiceSynthStatus = "idle" | "speaking" | "loading";

interface UseVoiceSynthesisOptions {
  engine?: VoiceEngine;
  /** ElevenLabs voice ID — defaults to Daniel (warm male) */
  voiceId?: string;
  /** Web Speech voice name preference */
  webVoiceName?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

const ELEVENLABS_TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

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
  const [currentEngine, setCurrentEngine] = useState<VoiceEngine>(engine);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortRef = useRef(false);

  const setIdle = useCallback(() => setStatus("idle"), []);

  const revokeUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, []);

  /** Pick best Web Speech voice */
  const getWebVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (!voices.length) return null;

    if (webVoiceName) {
      const m = voices.find(v => v.name.toLowerCase().includes(webVoiceName.toLowerCase()));
      if (m) return m;
    }

    for (const name of ["Google UK English Male", "Google UK English Female", "Daniel", "Samantha", "Alex", "Karen"]) {
      const m = voices.find(v => v.name.includes(name));
      if (m) return m;
    }
    return voices.find(v => v.lang.startsWith("en")) || voices[0];
  }, [webVoiceName]);

  /** Ensure voices are loaded (they load async in some browsers) */
  const ensureVoices = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      if (voices.length > 0) { resolve(); return; }
      const handler = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handler);
        resolve();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      // Safety timeout — some browsers never fire voiceschanged
      setTimeout(() => {
        window.speechSynthesis.removeEventListener("voiceschanged", handler);
        resolve();
      }, 2000);
    });
  }, []);

  /** Speak via Web Speech — returns Promise that resolves when done */
  const speakWebSpeech = useCallback((text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!window.speechSynthesis) {
        onError?.("Web Speech API not supported");
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      await ensureVoices();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getWebVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 0.85;

      utterance.onstart = () => {
        setStatus("speaking");
        onStart?.();
      };

      utterance.onend = () => {
        setIdle();
        onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        if (e.error !== "canceled") {
          setIdle();
          onError?.(e.error);
        }
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [getWebVoice, ensureVoices, rate, pitch, onStart, onEnd, onError, setIdle]);

  /** Speak via ElevenLabs — returns Promise that resolves when done */
  const speakElevenLabs = useCallback((text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      if (abortRef.current) { resolve(); return; }
      setStatus("loading");

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
          console.warn("[TTS] ElevenLabs unavailable, falling back to Web Speech");
          setCurrentEngine("web-speech");
          setIdle();
          resolve(speakWebSpeech(text));
          return;
        }

        if (abortRef.current) { setIdle(); resolve(); return; }

        const blob = await response.blob();
        revokeUrl();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        // Create a fresh Audio element each time — simplest cross-browser approach
        const audio = new Audio(url);
        audio.setAttribute("playsinline", "true");
        audioRef.current = audio;

        audio.onplay = () => {
          setStatus("speaking");
          onStart?.();
        };

        audio.onended = () => {
          setIdle();
          revokeUrl();
          onEnd?.();
          resolve();
        };

        audio.onerror = () => {
          setIdle();
          revokeUrl();
          onError?.("Audio playback failed");
          resolve();
        };

        await audio.play();
      } catch (err) {
        console.warn("[TTS] ElevenLabs error, falling back:", err);
        setIdle();
        revokeUrl();
        setCurrentEngine("web-speech");
        resolve(speakWebSpeech(text));
      }
    });
  }, [voiceId, speakWebSpeech, onStart, onEnd, onError, setIdle, revokeUrl]);

  /** Primary speak — cleans text, routes to active engine, returns Promise */
  const speak = useCallback((text: string): Promise<void> => {
    if (!text.trim()) return Promise.resolve();
    abortRef.current = false;

    const clean = text
      .replace(/[*_`#>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

    if (currentEngine === "elevenlabs") {
      return speakElevenLabs(clean);
    } else {
      return speakWebSpeech(clean);
    }
  }, [currentEngine, speakElevenLabs, speakWebSpeech]);

  /** Stop all speech immediately */
  const stop = useCallback(() => {
    abortRef.current = true;
    window.speechSynthesis?.cancel();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    revokeUrl();
    setIdle();
  }, [revokeUrl, setIdle]);

  /** Switch engine */
  const setEngine = useCallback((e: VoiceEngine) => {
    stop();
    setCurrentEngine(e);
  }, [stop]);

  return {
    speak,
    stop,
    status,
    isSpeaking: status === "speaking",
    isLoading: status === "loading",
    currentEngine,
    setEngine,
  };
}
