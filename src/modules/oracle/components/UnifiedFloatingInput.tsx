/**
 * UnifiedFloatingInput — Single frosted-glass pill for real-time content refinement.
 * Combines typing + voice input. Debounced live streaming as user types/speaks.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import VoiceInput from "@/modules/oracle/components/VoiceInput";

interface Props {
  /** Called with refinement text after debounce or Enter */
  onRefine: (instruction: string) => void;
  /** Whether the page is currently streaming updated content */
  streaming?: boolean;
  /** Cancel current stream */
  onCancel?: () => void;
  className?: string;
}

export default function UnifiedFloatingInput({ onRefine, streaming = false, onCancel, className = "" }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live refinement
  const scheduleRefine = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) return;
    debounceRef.current = setTimeout(() => {
      onRefine(text.trim());
    }, 600);
  }, [onRefine]);

  const handleChange = useCallback((newVal: string) => {
    setValue(newVal);
    scheduleRefine(newVal);
  }, [scheduleRefine]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onRefine(value.trim());
    }
    if (e.key === "Escape") {
      setValue("");
      inputRef.current?.blur();
      onCancel?.();
    }
  }, [value, onRefine, onCancel]);

  // Voice transcript → feed into input
  const handleVoiceTranscript = useCallback((text: string, isFinal: boolean) => {
    setValue(text);
    if (isFinal && text.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onRefine(text.trim());
    }
  }, [onRefine]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const showLive = streaming || (focused && value.trim().length > 0);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[60] flex justify-center pb-10 px-4 pointer-events-none ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="pointer-events-auto w-full max-w-xl"
      >
        <div className="relative flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-2xl shadow-[0_-4px_40px_-8px_rgba(0,0,0,0.5)] px-4 py-2.5">
          {/* Live indicator dot */}
          <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
            <AnimatePresence>
              {streaming && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-emerald-400/30"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  exit={{ opacity: 0, scale: 0.5 }}
                />
              )}
            </AnimatePresence>
            <span className={`relative w-2 h-2 rounded-full transition-colors duration-300 ${
              streaming ? "bg-emerald-400" : showLive ? "bg-white/20" : "bg-white/10"
            }`} />
          </div>

          {/* Sparkle icon */}
          <Sparkles className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
            streaming ? "text-emerald-400/70" : "text-white/25"
          }`} />

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Refine this page…"
            className="flex-1 bg-transparent text-[14px] text-white/90 placeholder:text-white/20 focus:outline-none caret-emerald-400 font-medium tracking-wide"
          />

          {/* Clear button */}
          <AnimatePresence>
            {value && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => { setValue(""); onCancel?.(); }}
                className="p-1 text-white/25 hover:text-white/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Voice input */}
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            onSpeechEnd={() => {}}
            size="sm"
          />
        </div>

        {/* Subtle hint text */}
        <AnimatePresence>
          {focused && !value && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-center text-[11px] text-white/15 mt-2 tracking-wide"
            >
              Type or speak to reshape this page in real time
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
