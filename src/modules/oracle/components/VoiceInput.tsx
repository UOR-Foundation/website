/**
 * VoiceInput — Web Speech API microphone button for voice-to-search.
 * Shows interim transcription in real time; auto-triggers search on speech end.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface Props {
  onTranscript: (text: string, isFinal: boolean) => void;
  onSpeechEnd?: () => void;
  className?: string;
  size?: "sm" | "md";
}

const SpeechRecognition = typeof window !== "undefined"
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

export default function VoiceInput({ onTranscript, onSpeechEnd, className = "", size = "md" }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSupported = !!SpeechRecognition;

  const start = useCallback(() => {
    if (!SpeechRecognition || listening) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        onTranscript(final, true);
      } else if (interim) {
        onTranscript(interim, false);
      }
    };

    recognition.onend = () => {
      setListening(false);
      onSpeechEnd?.();
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, onTranscript, onSpeechEnd]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
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
      title={listening ? "Stop listening" : "Voice search"}
    >
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
