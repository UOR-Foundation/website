/**
 * ImmersiveSearchView — Full-screen photo portal with clock, greeting, and search.
 * Inspired by Momentum / new-tab experiences.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Minimize2, Sparkles, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/* ── Unsplash curated landscape collection (no API key) ── */
const UNSPLASH_PHOTOS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80&auto=format&fit=crop", // Yosemite valley
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80&auto=format&fit=crop", // foggy forest
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80&auto=format&fit=crop", // forest path
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80&auto=format&fit=crop", // lake mountains
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80&auto=format&fit=crop", // sunlit valley
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80&auto=format&fit=crop", // waterfall bridge
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80&auto=format&fit=crop", // green hills
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=80&auto=format&fit=crop", // mountain lake
  "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=1920&q=80&auto=format&fit=crop", // sunset person
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80&auto=format&fit=crop", // tropical beach
];

function getDailyPhoto(): string {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return UNSPLASH_PHOTOS[day % UNSPLASH_PHOTOS.length];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

interface Props {
  onSearch: (query: string) => void;
  onExit: () => void;
  onEncode?: () => void;
  onAiMode?: () => void;
}

export default function ImmersiveSearchView({ onSearch, onExit, onEncode, onAiMode }: Props) {
  const { profile } = useAuth();
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [query, setQuery] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const photoUrl = getDailyPhoto();

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (q) onSearch(q);
  }, [query, onSearch]);

  const displayName = profile?.displayName || "Explorer";
  const greeting = getGreeting();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={photoUrl}
          alt=""
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          draggable={false}
        />
        {/* Dark overlay for legibility */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-col flex-1 text-white">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Left: quick actions */}
          <div className="flex items-center gap-4">
            {onEncode && (
              <button
                onClick={onEncode}
                className="flex items-center gap-1.5 text-white/60 hover:text-white/90 transition-colors text-sm font-medium"
                title="Encode content"
              >
                <Plus className="w-4 h-4" />
                <span>Encode</span>
              </button>
            )}
            {onAiMode && (
              <button
                onClick={onAiMode}
                className="flex items-center gap-1.5 text-white/60 hover:text-white/90 transition-colors text-sm font-medium"
                title="AI Oracle"
              >
                <Sparkles className="w-4 h-4" />
                <span>Oracle</span>
              </button>
            )}
          </div>

          {/* Right: exit button */}
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all text-sm font-medium"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>

        {/* ── Center: Clock + Greeting + Search ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-8" style={{ paddingBottom: "5vh" }}>
          {/* Clock */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="font-display font-bold tracking-tight select-none"
            style={{ fontSize: "clamp(5rem, 12vw, 10rem)", lineHeight: 1, textShadow: "0 2px 40px rgba(0,0,0,0.4)" }}
          >
            {clock}
          </motion.div>

          {/* Greeting */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="font-display text-white/90 select-none mt-3"
            style={{ fontSize: "clamp(1.25rem, 3vw, 2.25rem)", textShadow: "0 1px 20px rgba(0,0,0,0.3)" }}
          >
            {greeting}, {displayName}.
          </motion.p>

          {/* Search prompt + input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-10 w-full flex flex-col items-center"
            style={{ maxWidth: "min(580px, 80vw)" }}
          >
            <p className="text-white/60 text-lg font-medium mb-4 select-none">
              What is your main focus today?
            </p>
            <div className="w-full relative group">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Search the address space…"
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/35 focus:border-white/50 rounded-full px-6 py-4 text-white text-base placeholder:text-white/30 focus:outline-none transition-all shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]"
              />
              <button
                onClick={handleSubmit}
                disabled={!query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition-all"
              >
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex items-center justify-between px-8 py-5">
          <span className="text-white/40 text-xs font-medium tracking-wide">
            Universal Object Reference
          </span>
          <span className="text-white/40 text-xs">
            Photo · Unsplash
          </span>
        </div>
      </div>
    </motion.div>
  );
}
