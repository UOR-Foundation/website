/**
 * ImmersiveSearchView — Full-screen photo portal with clock, greeting, and search.
 * Now with inline Sovereign Context Vault picker.
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
import VaultContextPicker from "@/modules/sovereign-vault/components/VaultContextPicker";
import ContextPills from "@/modules/sovereign-vault/components/ContextPills";
import VaultImportDialog from "@/modules/sovereign-vault/components/VaultImportDialog";
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
  onSearch: (query: string, contextDocIds?: string[]) => void;
  onExit: () => void;
  onEncode?: () => void;
  onAiMode?: () => void;
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

  // Vault context state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importTab, setImportTab] = useState<"file" | "url">("file");

  const selectedDocs = vault.documents.filter((d) => selectedDocIds.includes(d.id));

  const toggleDoc = useCallback((docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }, []);

  const removeDoc = useCallback((docId: string) => {
    setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
  }, []);

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
    if (q) onSearch(q, selectedDocIds.length > 0 ? selectedDocIds : undefined);
  }, [query, onSearch, selectedDocIds]);

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
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
              {/* Outer glow ring — creates the "lifting off the screen" effect */}
              <div
                className="absolute -inset-[1px] rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, hsl(195 60% 65% / 0.25), hsl(200 40% 50% / 0.08), hsl(210 50% 60% / 0.2))",
                  filter: "blur(6px)",
                }}
              />
              {/* Ambient depth shadow — always visible, intensifies on hover */}
              <div
                className="absolute -inset-1 rounded-full pointer-events-none transition-all duration-500"
                style={{
                  boxShadow: "0 12px 48px -12px hsl(200 40% 8% / 0.7), 0 4px 16px -4px hsl(200 50% 15% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
                }}
              />

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
                className="relative w-full rounded-full pl-14 pr-24 py-4 text-white text-base focus:outline-none transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, hsl(200 25% 22% / 0.55), hsl(195 20% 18% / 0.45), hsl(200 30% 20% / 0.5))",
                  backdropFilter: "blur(40px) saturate(1.6)",
                  WebkitBackdropFilter: "blur(40px) saturate(1.6)",
                  border: "1px solid hsl(0 0% 100% / 0.14)",
                  boxShadow: "inset 0 1px 1px hsl(0 0% 100% / 0.08), inset 0 -1px 2px hsl(0 0% 0% / 0.15), 0 1px 3px hsl(0 0% 0% / 0.2)",
                  color: "hsl(0 0% 100% / 0.95)",
                  caretColor: "hsl(195 70% 65%)",
                  textShadow: "0 1px 2px hsl(0 0% 0% / 0.2)",
                }}
              />

              {/* + button (vault context picker trigger) — left of input */}
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPickerOpen((p) => !p)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: pickerOpen || selectedDocIds.length > 0
                      ? "hsl(var(--primary) / 0.2)"
                      : "hsl(0 0% 100% / 0.08)",
                    border: `1px solid ${pickerOpen || selectedDocIds.length > 0 ? "hsl(var(--primary) / 0.3)" : "hsl(0 0% 100% / 0.1)"}`,
                    color: pickerOpen || selectedDocIds.length > 0 ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.5)",
                    boxShadow: "0 2px 8px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
                  }}
                  title="Attach vault documents as context"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>

                <VaultContextPicker
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  vault={vault}
                  selectedIds={selectedDocIds}
                  onToggle={toggleDoc}
                  onImportFile={() => { setImportTab("file"); setImportDialogOpen(true); }}
                  onImportUrl={() => { setImportTab("url"); setImportDialogOpen(true); }}
                  anchor="below"
                  className="top-12 left-0"
                />
              </div>

              {/* Right-side actions */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                <VoiceInput
                  onTranscript={(text, isFinal) => {
                    setQuery(text);
                    if (isFinal && text.trim()) onSearch(text.trim(), selectedDocIds.length > 0 ? selectedDocIds : undefined);
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
            {selectedDocs.length > 0 && (
              <div className="mt-3">
                <ContextPills documents={selectedDocs} onRemove={removeDoc} />
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

      {/* Import dialog */}
      <VaultImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} vault={vault} />
    </motion.div>
  );
}
