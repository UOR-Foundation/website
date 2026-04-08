/**
 * ImmersiveSearchView — Full-screen photo portal with clock, greeting, and search.
 * Inspired by Momentum / new-tab experiences. Now with voice input and vault drop zone.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Maximize2, Minimize2, Sparkles, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getPhasePhoto, getCurrentPhase, preloadNextPhasePhoto, initLocation } from "@/modules/oracle/lib/immersive-photos";
import type { SolarPhase } from "@/modules/oracle/lib/solar-position";
import VoiceInput from "./VoiceInput";
import SoundCloudFab from "./SoundCloudFab";
import ImmersiveQuote from "./ImmersiveQuote";
import VaultContextBadge from "@/modules/sovereign-vault/components/VaultContextBadge";
import { useVault } from "@/modules/sovereign-vault/hooks/useVault";
import { toast } from "sonner";

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
  /** Whether the browser is currently in fullscreen mode */
  isFullscreen?: boolean;
}

export default function ImmersiveSearchView({ onSearch, onExit, onEncode, onAiMode, isFullscreen = false }: Props) {
  const { profile } = useAuth();
  const vault = useVault();
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [query, setQuery] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(() => getPhasePhoto());
  const phaseRef = useRef<SolarPhase>(getCurrentPhase());
  const [dragOver, setDragOver] = useState(false);

  // Solar-phase photo update (checked every 60s)
  useEffect(() => {
    initLocation().then(() => {
      const phase = getCurrentPhase();
      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        setPhotoUrl(getPhasePhoto());
      }
      preloadNextPhasePhoto();
    });

    const interval = setInterval(() => {
      const phase = getCurrentPhase();
      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        setPhotoUrl(getPhasePhoto());
        preloadNextPhasePhoto();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  // Don't auto-focus on mobile — let user tap to open keyboard
  // On desktop, focus after a short delay for convenience
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (q) onSearch(q);
  }, [query, onSearch]);

  const handleVaultDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!vault.ready) return;
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      const doc = await vault.importFile(file);
      if (doc) toast.success(`Imported to vault: ${doc.filename}`);
    }
  }, [vault]);

  const displayName = profile?.displayName || "Explorer";
  const greeting = getGreeting();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex flex-col"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleVaultDrop}
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

          {/* Right: fullscreen toggle */}
          <button
            onClick={onExit}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
                placeholder="What is your main focus today?"
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/35 focus:border-white/50 rounded-full px-6 py-4 text-white text-base placeholder:text-white/30 focus:outline-none transition-all shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <VoiceInput
                  onTranscript={(text, isFinal) => {
                    setQuery(text);
                    if (isFinal && text.trim()) onSearch(text.trim());
                  }}
                  size="sm"
                  className="text-white/60 hover:text-white/90 border-white/10 hover:border-white/25"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim()}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition-all"
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            {/* Vault context badge */}
            {vault.count > 0 && (
              <div className="mt-3">
                <VaultContextBadge count={vault.count} />
              </div>
            )}
          </motion.div>
        </div>

        {/* Drag overlay */}
        {dragOver && vault.ready && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-white/40 rounded-3xl px-12 py-8 text-center">
              <p className="text-white text-lg font-medium">Drop to import to Vault</p>
              <p className="text-white/50 text-sm mt-1">Files will be encrypted & content-addressed</p>
            </div>
          </div>
        )}

        {/* ── Bottom bar ── */}
        <div className="flex flex-col items-center px-8 py-6">
          <ImmersiveQuote />
        </div>

        {/* ── Bottom-right: SoundCloud + attribution ── */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3 z-10">
          <SoundCloudFab />
          <span className="text-white/40 text-xs">Photo · Unsplash</span>
        </div>
      </div>
    </motion.div>
  );
}
