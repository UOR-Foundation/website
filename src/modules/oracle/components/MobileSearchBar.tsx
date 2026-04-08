/**
 * MobileSearchBar — bottom-pinned input bar for mobile search (Perplexity-style).
 * Now with voice input and live mode toggle.
 */

import { useState, useRef } from "react";
import { Send, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import VoiceInput from "./VoiceInput";
import LiveSearchToggle from "./LiveSearchToggle";

interface Props {
  onSubmit: (query: string) => void;
  onEncode: () => void;
  onAiMode: () => void;
  loading?: boolean;
}

export default function MobileSearchBar({ onSubmit, onEncode, onAiMode, loading }: Props) {
  const [value, setValue] = useState("");
  const [liveMode, setLiveMode] = useState(() => localStorage.getItem("uor-live-search") === "true");
  const inputRef = useRef<HTMLInputElement>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
  };

  const handleChange = (text: string) => {
    setValue(text);
    if (liveMode && text.trim().length >= 3) {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
      liveTimerRef.current = setTimeout(() => onSubmit(text.trim()), 800);
    }
  };

  const toggleLive = () => {
    setLiveMode(prev => {
      const next = !prev;
      localStorage.setItem("uor-live-search", String(next));
      return next;
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] px-3 pb-[env(safe-area-inset-bottom,12px)] pt-2">
      {/* Fade-out gradient above bar */}
      <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative rounded-2xl border border-white/[0.1] bg-[hsl(0_0%_10%/0.95)] backdrop-blur-xl shadow-[0_-4px_40px_-8px_hsl(0_0%_0%/0.6)]"
      >
        <div className="flex items-center gap-1 px-2 py-1.5">
          {/* Encode button */}
          <button
            onClick={onEncode}
            className="p-2.5 rounded-xl text-muted-foreground/40 hover:text-foreground/60 active:bg-white/[0.06] transition-colors shrink-0"
            aria-label="Encode content"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Search anything…"
            className="flex-1 bg-transparent py-2.5 px-1 text-[15px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none caret-primary"
          />

          {/* Voice input */}
          <VoiceInput
            onTranscript={(text, isFinal) => {
              setValue(text);
              if (isFinal && text.trim().length >= 2) onSubmit(text.trim());
            }}
            size="sm"
          />

          {/* Live mode toggle */}
          <LiveSearchToggle active={liveMode} onToggle={toggleLive} streaming={loading} />

          {/* AI Oracle pill */}
          <button
            onClick={onAiMode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/[0.08] text-muted-foreground/50 hover:text-foreground/70 active:bg-white/[0.06] transition-colors shrink-0"
            aria-label="AI Oracle"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || loading}
            className="p-2.5 rounded-xl text-foreground/60 hover:text-foreground/90 active:bg-white/[0.06] transition-all disabled:opacity-20 shrink-0"
            aria-label="Search"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
