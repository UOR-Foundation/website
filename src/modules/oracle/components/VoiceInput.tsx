/**
 * VoiceInput — Unified STT microphone button.
 * Uses HologramSttEngine (Whisper ONNX local → native cloud fallback).
 * Shows privacy indicator: green dot (local) / amber dot (cloud).
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { getHologramStt } from "@/modules/uns/core/hologram/stt-engine";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";

interface Props {
  onTranscript: (text: string, isFinal: boolean) => void;
  onSpeechEnd?: () => void;
  className?: string;
  size?: "sm" | "md";
}

export default function VoiceInput({ onTranscript, onSpeechEnd, className = "", size = "md" }: Props) {
  const { modKey } = usePlatform();
  const [listening, setListening] = useState(false);
  const handleRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const stt = getHologramStt();

  const isSupported = stt.whisperAvailable || stt.nativeAvailable;
  const privacy = stt.privacy;

  const start = useCallback(() => {
    if (listening) return;

    stt.autoSelect();

    const handle = stt.startContinuousNative({
      onInterim: (text) => onTranscript(text, false),
      onFinal: (text) => onTranscript(text, true),
      onEnd: (finalText) => {
        setListening(false);
        if (finalText) onTranscript(finalText, true);
        onSpeechEnd?.();
      },
      onError: () => setListening(false),
    });

    handleRef.current = handle;
    setListening(true);
  }, [listening, onTranscript, onSpeechEnd, stt]);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    return () => { handleRef.current?.abort(); };
  }, []);

  if (!isSupported) return null;

  const iconSize = size === "sm" ? 14 : 16;
  const btnSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  return (
    <button
      onClick={listening ? stop : start}
      className={`
        ${btnSize} rounded-full flex items-center justify-center transition-all relative
        ${listening
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : "bg-muted/10 text-muted-foreground/50 hover:text-foreground/70 border border-transparent hover:border-border/20"
        }
        ${className}
      `}
      title={listening ? "Stop listening" : `Voice search (${modKey}+Shift+V)`}
    >
      {/* Privacy indicator dot */}
      <span
        className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
          privacy === "local" ? "bg-emerald-400" : "bg-amber-400"
        } ${listening ? "opacity-100" : "opacity-0"} transition-opacity`}
        title={privacy === "local" ? "On-device (private)" : "Cloud speech"}
      />

      {/* Pulsing ring when listening */}
      <AnimatePresence>
        {listening && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-red-400/40"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </AnimatePresence>
      {listening ? <MicOff size={iconSize} /> : <Mic size={iconSize} />}
    </button>
  );
}
