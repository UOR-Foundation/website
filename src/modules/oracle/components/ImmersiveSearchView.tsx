/**
 * ImmersiveSearchView — Full-screen photo portal with clock, greeting, and search.
 * Now with unified context menu (guest + vault).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Maximize2, Minimize2, Sparkles, Plus, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getPhasePhoto, getCurrentPhase, preloadNextPhasePhoto, initLocation, getHourlyFallback } from "@/modules/oracle/lib/immersive-photos";
import type { SolarPhase } from "@/modules/oracle/lib/solar-position";
import VoiceInput from "./VoiceInput";
import SoundCloudFab from "./SoundCloudFab";
import ImmersiveQuote from "./ImmersiveQuote";
import ContextMenu from "@/modules/sovereign-vault/components/ContextMenu";
import ContextPills from "@/modules/sovereign-vault/components/ContextPills";
import { useContextManager } from "@/modules/sovereign-vault/hooks/useContextManager";
import { toast } from "sonner";
import { isValidTriword, triwordBreakdown } from "@/lib/uor-triword";

/** Detect if input is a valid address (triword or IPv6) */
type AddressKind = "triword" | "ipv6" | null;

function detectAddress(input: string): { kind: AddressKind; label: string | null } {
  const t = input.trim();
  if (!t) return { kind: null, label: null };

  const normalized = t.replace(/\s*[·.]\s*/g, ".").replace(/\s+/g, ".").toLowerCase();
  const parts = normalized.split(".");
  if (parts.length === 3 && parts.every((p) => p.length >= 2)) {
    if (isValidTriword(normalized)) {
      const bd = triwordBreakdown(normalized);
      return {
        kind: "triword",
        label: bd
          ? `${bd.observer.charAt(0).toUpperCase() + bd.observer.slice(1)}.${bd.observable.charAt(0).toUpperCase() + bd.observable.slice(1)}.${bd.context.charAt(0).toUpperCase() + bd.context.slice(1)}`
          : null,
      };
    }
  }

  if (/^[0-9a-fA-F:]+$/.test(t) && t.includes(":") && t.split(":").length >= 3) {
    return { kind: "ipv6", label: t };
  }

  return { kind: null, label: null };
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
  onSearch: (query: string, contextDocIds?: string[]) => void;
  onExit: () => void;
  onEncode?: () => void;
  onAiMode?: () => void;
  isFullscreen?: boolean;
}

export default function ImmersiveSearchView({ onSearch, onExit, onEncode, onAiMode, isFullscreen = false }: Props) {
  const { profile } = useAuth();
  const ctx = useContextManager();
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [query, setQuery] = useState("");
  const detected = useMemo(() => detectAddress(query), [query]);
  const isAddress = detected.kind !== null;
  const [imgLoaded, setImgLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(() => getPhasePhoto());
  const phaseRef = useRef<SolarPhase>(getCurrentPhase());
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Solar-phase photo update
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

  // Auto-focus on desktop
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (q) onSearch(q, ctx.getContextDocIds());
  }, [query, onSearch, ctx]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await ctx.addFile(file);
      toast.success(`Added to context: ${file.name}`);
    }
  }, [ctx]);

  const displayName = profile?.displayName || "Explorer";
  const greeting = getGreeting();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex flex-col"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={photoUrl}
          alt=""
          onLoad={() => setImgLoaded(true)}
          onError={() => setPhotoUrl(getHourlyFallback())}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          draggable={false}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-col flex-1 text-white">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-4">
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

          <button
            onClick={onExit}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Center: Clock + Greeting + Search */}
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

          {/* Search input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-10 w-full flex flex-col items-center"
            style={{ maxWidth: "min(580px, 80vw)" }}
          >
            <div className="w-full relative group">
              {/* Outer glow ring */}
              <div
                className="absolute -inset-[1px] rounded-full transition-all duration-500 pointer-events-none"
                style={{
                  opacity: isAddress ? 1 : undefined,
                  background: isAddress
                    ? "linear-gradient(135deg, hsl(160 60% 50% / 0.3), hsl(170 50% 40% / 0.1), hsl(155 60% 55% / 0.25))"
                    : "linear-gradient(135deg, hsl(195 60% 65% / 0.25), hsl(200 40% 50% / 0.08), hsl(210 50% 60% / 0.2))",
                  filter: "blur(6px)",
                }}
              />
              {isAddress && (
                <div
                  className="absolute -inset-[1px] rounded-full pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, hsl(160 55% 50% / 0.15), transparent, hsl(155 50% 45% / 0.12))",
                    filter: "blur(12px)",
                  }}
                />
              )}
              <div
                className="absolute -inset-1 rounded-full pointer-events-none transition-all duration-500"
                style={{
                  boxShadow: isAddress
                    ? "0 12px 48px -12px hsl(160 40% 12% / 0.7), 0 4px 16px -4px hsl(160 50% 20% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.08)"
                    : "0 12px 48px -12px hsl(200 40% 8% / 0.7), 0 4px 16px -4px hsl(200 50% 15% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
                }}
              />

              {/* Address badge */}
              <AnimatePresence>
                {isAddress && (
                  <motion.div
                    initial={{ opacity: 0, x: -8, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -8, scale: 0.9 }}
                    transition={{ type: "spring", damping: 25, stiffness: 400 }}
                    className="absolute left-14 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 pointer-events-none"
                  >
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span className="text-[11px] font-medium tracking-wide text-emerald-400/80 uppercase">
                      {detected.kind === "triword" ? "Address" : "IPv6"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

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
                className="relative w-full rounded-full pr-24 py-4 text-base focus:outline-none transition-all duration-300"
                style={{
                  paddingLeft: isAddress ? "7.5rem" : "3.5rem",
                  background: isAddress
                    ? "linear-gradient(135deg, hsl(165 25% 18% / 0.6), hsl(160 20% 15% / 0.5), hsl(170 25% 17% / 0.55))"
                    : "linear-gradient(135deg, hsl(200 25% 22% / 0.55), hsl(195 20% 18% / 0.45), hsl(200 30% 20% / 0.5))",
                  backdropFilter: "blur(40px) saturate(1.6)",
                  WebkitBackdropFilter: "blur(40px) saturate(1.6)",
                  border: isAddress
                    ? "1px solid hsl(160 50% 50% / 0.25)"
                    : "1px solid hsl(0 0% 100% / 0.14)",
                  boxShadow: isAddress
                    ? "inset 0 1px 1px hsl(160 50% 60% / 0.1), inset 0 -1px 2px hsl(0 0% 0% / 0.15), 0 1px 3px hsl(0 0% 0% / 0.2)"
                    : "inset 0 1px 1px hsl(0 0% 100% / 0.08), inset 0 -1px 2px hsl(0 0% 0% / 0.15), 0 1px 3px hsl(0 0% 0% / 0.2)",
                  color: isAddress ? "hsl(160 40% 85%)" : "hsl(0 0% 100% / 0.95)",
                  caretColor: isAddress ? "hsl(160 60% 60%)" : "hsl(195 70% 65%)",
                  textShadow: "0 1px 2px hsl(0 0% 0% / 0.2)",
                  fontFamily: isAddress ? "var(--font-mono, ui-monospace, monospace)" : undefined,
                  letterSpacing: isAddress ? "0.02em" : undefined,
                }}
              />

              {/* + button (context menu trigger) */}
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPickerOpen((p) => !p)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: pickerOpen || ctx.contextItems.length > 0
                      ? "hsl(var(--primary) / 0.2)"
                      : "hsl(0 0% 100% / 0.08)",
                    border: `1px solid ${pickerOpen || ctx.contextItems.length > 0 ? "hsl(var(--primary) / 0.3)" : "hsl(0 0% 100% / 0.1)"}`,
                    color: pickerOpen || ctx.contextItems.length > 0 ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.5)",
                    boxShadow: "0 2px 8px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
                  }}
                  title="Add context — files, text, or URLs"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>

                <ContextMenu
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  ctx={ctx}
                  anchor="below"
                  className="top-12 left-0"
                />
              </div>

              {/* Right-side actions */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                <VoiceInput
                  onTranscript={(text, isFinal) => {
                    setQuery(text);
                    if (isFinal && text.trim()) onSearch(text.trim(), ctx.getContextDocIds());
                  }}
                  size="sm"
                  className="text-white/60 hover:text-white/90 border-white/10 hover:border-white/25"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-25"
                  style={{
                    background: "hsl(0 0% 100% / 0.1)",
                    border: "1px solid hsl(0 0% 100% / 0.12)",
                    boxShadow: "0 2px 8px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
                  }}
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Context pills */}
            {ctx.contextItems.length > 0 && (
              <div className="mt-3">
                <ContextPills items={ctx.contextItems} onRemove={ctx.remove} />
              </div>
            )}
          </motion.div>
        </div>

        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-white/40 rounded-3xl px-12 py-8 text-center">
              <p className="text-white text-lg font-medium">Drop to add context</p>
              <p className="text-white/50 text-sm mt-1">Files will be extracted and added to your session</p>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex flex-col items-center px-8 py-6">
          <ImmersiveQuote />
        </div>

        {/* Bottom-right */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3 z-10">
          <SoundCloudFab />
          <span className="text-white/40 text-xs">Photo · Unsplash</span>
        </div>
      </div>
    </motion.div>
  );
}
