/**
 * ContextMenu — Two-tier dropdown for adding context (guest + member).
 * Designed as a premium "Sovereign Vault" experience.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUp, Type, Link2, Shield, Loader2, Fingerprint, Sparkles, ArrowRight } from "lucide-react";
import type { ContextManagerHandle } from "../hooks/useContextManager";
import VaultContextPicker from "./VaultContextPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: ContextManagerHandle;
  anchor?: "above" | "below";
  className?: string;
}

export default function ContextMenu({ open, onOpenChange, ctx, anchor = "below", className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subView, setSubView] = useState<null | "paste" | "url" | "vault">(null);
  const [pasteText, setPasteText] = useState("");
  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
        setSubView(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setTimeout(() => setSubView(null), 200);
  }, [open]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLoading(true);
    try {
      for (const file of files) await ctx.addFile(file);
    } finally {
      setLoading(false);
      onOpenChange(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [ctx, onOpenChange]);

  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) return;
    ctx.addPaste(pasteText.trim());
    setPasteText("");
    setSubView(null);
    onOpenChange(false);
  }, [pasteText, ctx, onOpenChange]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlText.trim()) return;
    setLoading(true);
    try {
      await ctx.addUrl(urlText.trim());
      setUrlText("");
      setSubView(null);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [urlText, ctx, onOpenChange]);

  const slideDir = anchor === "above" ? { y: 12 } : { y: -12 };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept=".txt,.md,.json,.csv,.pdf,.docx,.html,.htm,.xml,.tsv"
      />
      <AnimatePresence>
        {open && (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95, ...slideDir }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, ...slideDir }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className={`absolute z-[80] w-[320px] rounded-2xl overflow-hidden ${className}`}
            style={{
              background: "linear-gradient(165deg, hsl(220 20% 10% / 0.97), hsl(220 15% 7% / 0.98))",
              backdropFilter: "blur(40px) saturate(1.8)",
              WebkitBackdropFilter: "blur(40px) saturate(1.8)",
              border: "1px solid hsl(220 20% 30% / 0.15)",
              boxShadow: "0 24px 80px -12px hsl(220 40% 4% / 0.8), 0 8px 24px -4px hsl(220 30% 6% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
            }}
          >
            {/* Ambient glow line at top */}
            <div
              className="h-[1px] w-full"
              style={{
                background: "linear-gradient(90deg, transparent 10%, hsl(var(--primary) / 0.4) 50%, transparent 90%)",
              }}
            />

            {subView === null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
              >
                {/* Header */}
                <div className="px-5 pt-4 pb-2 flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
                      border: "1px solid hsl(var(--primary) / 0.2)",
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground/90 tracking-tight">Add Context</h3>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">Enrich your query with data</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="px-2 py-1">
                  <MenuItem
                    icon={<FileUp className="w-4 h-4" />}
                    label="Upload File"
                    hint="PDF, TXT, Markdown, CSV, JSON"
                    onClick={() => fileInputRef.current?.click()}
                    loading={loading}
                    gradient="from-blue-500/10 to-cyan-500/5"
                    iconColor="text-blue-400/80"
                  />
                  <MenuItem
                    icon={<Type className="w-4 h-4" />}
                    label="Paste Text"
                    hint="Raw text, notes, or structured data"
                    onClick={() => setSubView("paste")}
                    gradient="from-amber-500/10 to-orange-500/5"
                    iconColor="text-amber-400/80"
                  />
                  <MenuItem
                    icon={<Link2 className="w-4 h-4" />}
                    label="Import from URL"
                    hint="Scrape and extract web content"
                    onClick={() => setSubView("url")}
                    gradient="from-emerald-500/10 to-teal-500/5"
                    iconColor="text-emerald-400/80"
                  />
                </div>

                {/* Divider */}
                <div className="mx-4 my-1">
                  <div
                    className="h-[1px]"
                    style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.06), transparent)" }}
                  />
                </div>

                {/* Vault / Guest section */}
                {ctx.vault.ready ? (
                  <div className="px-2 pb-2">
                    <MenuItem
                      icon={<Shield className="w-4 h-4" />}
                      label="Sovereign Vault"
                      hint="Persistent encrypted documents"
                      onClick={() => setSubView("vault")}
                      gradient="from-primary/15 to-primary/5"
                      iconColor="text-primary"
                      accent
                    />
                  </div>
                ) : (
                  <div className="px-4 pb-3.5 pt-1">
                    <div
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, hsl(0 0% 100% / 0.02), hsl(0 0% 100% / 0.01))",
                        border: "1px dashed hsl(0 0% 100% / 0.06)",
                      }}
                    >
                      <Fingerprint className="w-5 h-5 text-muted-foreground/20 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                          Context is <span className="text-foreground/60 font-medium">session-only</span> for guests.
                        </p>
                        <p className="text-[10px] text-muted-foreground/30 mt-0.5">
                          Create a Sovereign ID to persist your vault.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Sub-view: Paste Text */}
            {subView === "paste" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="p-4 flex flex-col gap-3"
              >
                <SubViewHeader title="Paste Text" onBack={() => setSubView(null)} />
                <textarea
                  autoFocus
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your text, data, or notes here…"
                  className="w-full h-32 text-[13px] leading-relaxed rounded-xl p-3.5 text-foreground placeholder:text-muted-foreground/25 focus:outline-none resize-none"
                  style={{
                    background: "hsl(0 0% 100% / 0.03)",
                    border: "1px solid hsl(0 0% 100% / 0.06)",
                    boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.2)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "hsl(var(--primary) / 0.3)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "hsl(0 0% 100% / 0.06)";
                  }}
                />
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="self-end flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-20"
                  style={{
                    background: pasteText.trim()
                      ? "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.15))"
                      : "hsl(0 0% 100% / 0.03)",
                    border: `1px solid ${pasteText.trim() ? "hsl(var(--primary) / 0.3)" : "hsl(0 0% 100% / 0.06)"}`,
                    color: pasteText.trim() ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.3)",
                  }}
                >
                  Add to context
                  <ArrowRight className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {/* Sub-view: URL */}
            {subView === "url" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="p-4 flex flex-col gap-3"
              >
                <SubViewHeader title="Import URL" onBack={() => setSubView(null)} />
                <input
                  autoFocus
                  type="url"
                  value={urlText}
                  onChange={(e) => setUrlText(e.target.value)}
                  placeholder="https://example.com/article"
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  className="w-full text-[13px] rounded-xl px-3.5 py-3 text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
                  style={{
                    background: "hsl(0 0% 100% / 0.03)",
                    border: "1px solid hsl(0 0% 100% / 0.06)",
                    boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.2)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "hsl(var(--primary) / 0.3)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "hsl(0 0% 100% / 0.06)";
                  }}
                />
                <button
                  onClick={handleUrlSubmit}
                  disabled={!urlText.trim() || loading}
                  className="self-end flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-20"
                  style={{
                    background: urlText.trim()
                      ? "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.15))"
                      : "hsl(0 0% 100% / 0.03)",
                    border: `1px solid ${urlText.trim() ? "hsl(var(--primary) / 0.3)" : "hsl(0 0% 100% / 0.06)"}`,
                    color: urlText.trim() ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.3)",
                  }}
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Fetch & add
                  <ArrowRight className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {/* Sub-view: Vault picker */}
            {subView === "vault" && ctx.vault.ready && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="flex flex-col max-h-[50vh]"
              >
                <div className="px-4 pt-3.5 pb-1">
                  <SubViewHeader title="Sovereign Vault" onBack={() => setSubView(null)} count={ctx.vault.count} />
                </div>
                <VaultContextPicker
                  open={true}
                  onOpenChange={() => setSubView(null)}
                  vault={ctx.vault}
                  selectedIds={ctx.selectedVaultIds}
                  onToggle={ctx.toggleVaultDoc}
                  onImportFile={() => fileInputRef.current?.click()}
                  onImportUrl={() => setSubView("url")}
                  anchor={anchor}
                  className="relative w-full shadow-none border-0 rounded-none bg-transparent"
                  inline
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Sub-components ── */

function SubViewHeader({ title, onBack, count }: { title: string; onBack: () => void; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onBack}
        className="text-muted-foreground/40 hover:text-foreground/70 text-[11px] font-medium transition-colors"
      >
        ← Back
      </button>
      <span className="text-[13px] font-semibold text-foreground/90">{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-[10px] text-muted-foreground/40">
          {count} doc{count !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function MenuItem({ icon, label, hint, onClick, loading, gradient, iconColor, accent }: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  loading?: boolean;
  gradient: string;
  iconColor: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 hover:bg-white/[0.04] active:bg-white/[0.06] active:scale-[0.99] disabled:opacity-50 group"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} transition-transform duration-200 group-hover:scale-105`}
        style={{
          border: accent ? "1px solid hsl(var(--primary) / 0.2)" : "1px solid hsl(0 0% 100% / 0.05)",
          boxShadow: "0 2px 8px hsl(0 0% 0% / 0.2)",
        }}
      >
        <div className={iconColor}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium ${accent ? "text-primary" : "text-foreground/85"}`}>{label}</p>
        <p className="text-[10px] text-muted-foreground/35 mt-0.5 leading-snug">{hint}</p>
      </div>
    </button>
  );
}
