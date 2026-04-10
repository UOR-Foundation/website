/**
 * useVoiceToVoice — Full voice-to-voice conversation loop.
 * ═════════════════════════════════════════════════════════
 *
 * Orchestrates: STT → AI cleanup → Oracle response → TTS playback.
 * State machine: idle → listening → processing → speaking → idle.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useGlobalDictation, type DictationState } from "@/modules/oracle/hooks/useGlobalDictation";
import { getHologramTts, type TTSClient } from "@/modules/uns/core/hologram/tts-client";
import { askOracleForVoiceReply } from "@/modules/oracle/lib/voice-reply";

export type VoicePhase = "idle" | "listening" | "processing" | "speaking";

export interface VoiceToVoiceState {
  phase: VoicePhase;
  dictation: DictationState;
  /** The AI's spoken response text */
  responseText: string;
  /** Whether voice replies are enabled */
  voiceReplyEnabled: boolean;
}

export interface VoiceToVoiceActions {
  toggle: () => void;
  stop: () => void;
  cancel: () => void;
  setVoiceReplyEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = "uor:voice-reply-enabled";

export function useVoiceToVoice(): [VoiceToVoiceState, VoiceToVoiceActions] {
  const [dictationState, dictationActions] = useGlobalDictation();
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [responseText, setResponseText] = useState("");
  const [voiceReplyEnabled, setVoiceReplyEnabledState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });

  const ttsRef = useRef<TTSClient>(getHologramTts());
  const phaseRef = useRef<VoicePhase>("idle");
  phaseRef.current = phase;

  const setVoiceReplyEnabled = useCallback((enabled: boolean) => {
    setVoiceReplyEnabledState(enabled);
    try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch {}
  }, []);

  // Track dictation state → derive phase
  useEffect(() => {
    if (dictationState.active && phaseRef.current === "idle") {
      setPhase("listening");
    } else if (dictationState.cleaning && phaseRef.current === "listening") {
      setPhase("processing");
    }
  }, [dictationState.active, dictationState.cleaning]);

  // When dictation finishes (active→false, not cleaning), trigger voice reply
  const prevActiveRef = useRef(false);
  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = dictationState.active;

    if (wasActive && !dictationState.active && !dictationState.cleaning) {
      // Dictation just ended with committed text
      const finalText = dictationState.committed;

      if (voiceReplyEnabled && finalText && finalText.trim().length > 2) {
        setPhase("processing");
        handleVoiceReply(finalText);
      } else {
        setPhase("idle");
      }
    }
  }, [dictationState.active, dictationState.cleaning, dictationState.committed, voiceReplyEnabled]);

  const handleVoiceReply = useCallback(async (transcript: string) => {
    try {
      const reply = await askOracleForVoiceReply(transcript);
      if (!reply || phaseRef.current !== "processing") {
        setPhase("idle");
        return;
      }

      setResponseText(reply);
      setPhase("speaking");

      await ttsRef.current.speak(reply, {
        onEnd: () => {
          setPhase("idle");
          setResponseText("");
        },
        onError: () => {
          setPhase("idle");
          setResponseText("");
        },
      });
    } catch {
      setPhase("idle");
      setResponseText("");
    }
  }, []);

  const toggle = useCallback(() => {
    if (phase === "speaking") {
      ttsRef.current.stop();
      setPhase("idle");
      setResponseText("");
    } else if (phase === "idle") {
      dictationActions.toggle();
    } else if (phase === "listening") {
      dictationActions.stop();
    }
  }, [phase, dictationActions]);

  const stop = useCallback(() => {
    if (phase === "listening") {
      dictationActions.stop();
    } else if (phase === "speaking") {
      ttsRef.current.stop();
      setPhase("idle");
      setResponseText("");
    }
  }, [phase, dictationActions]);

  const cancel = useCallback(() => {
    ttsRef.current.stop();
    dictationActions.cancel();
    setPhase("idle");
    setResponseText("");
  }, [dictationActions]);

  // Cleanup
  useEffect(() => {
    return () => {
      ttsRef.current.stop();
    };
  }, []);

  return [
    { phase, dictation: dictationState, responseText, voiceReplyEnabled },
    { toggle, stop, cancel, setVoiceReplyEnabled },
  ];
}
