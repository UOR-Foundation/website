/**
 * ContextMenu — Two-tier dropdown for adding context (guest + member).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUp, Type, Link2, Shield, Loader2, UserPlus } from "lucide-react";
import type { ContextManagerHandle } from "../hooks/useContextManager";
import VaultContextPicker from "./VaultContextPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: ContextManagerHandle;
  /** Position */
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

  // Close on outside click
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

  // Reset sub-view when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => setSubView(null), 200);
    }
  }, [open]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLoading(true);
    try {
      for (const file of files) {
        await ctx.addFile(file);
      }
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
            initial={{ opacity: 0, ...slideDir }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, ...slideDir }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className={`absolute z-[80] w-[280px] rounded-2xl border border-white/[0.08] bg-[hsl(0_0%_8%/0.96)] backdrop-blur-xl shadow-[0_16px_64px_-12px_hsl(0_0%_0%/0.7)] flex flex-col overflow-hidden ${className}`}
          >
            {subView === null && (
              <>
                {/* Section: Add Context */}
                <div className="px-4 pt-3.5 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">Add Context</span>
                </div>

                <div className="px-1.5 pb-1">
                  <MenuButton
                    icon={<FileUp className="w-4 h-4" />}
                    label="Upload File"
                    description="PDF, TXT, Markdown, CSV, JSON…"
                    onClick={() => fileInputRef.current?.click()}
                    loading={loading}
                  />
                  <MenuButton
                    icon={<Type className="w-4 h-4" />}
                    label="Paste Text"
                    description="Add raw text or structured data"
                    onClick={() => setSubView("paste")}
                  />
                  <MenuButton
                    icon={<Link2 className="w-4 h-4" />}
                    label="Import from URL"
                    description="Scrape and extract web content"
                    onClick={() => setSubView("url")}
                  />
                </div>

                {/* Divider + Vault section */}
                <div className="border-t border-white/[0.06] mx-3" />

                {ctx.vault.ready ? (
                  <div className="px-1.5 py-1.5">
                    <MenuButton
                      icon={<Shield className="w-4 h-4 text-primary" />}
                      label="Sovereign Vault"
                      description="Your persistent encrypted documents"
                      onClick={() => setSubView("vault")}
                      accent
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 px-4 py-3">
                    <UserPlus className="w-4 h-4 text-muted-foreground/30 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                        Context is <span className="text-muted-foreground/70 font-medium">session-only</span> for guests.
                      </p>
                      <p className="text-[10px] text-muted-foreground/30 mt-0.5">
                        Create a Sovereign ID to save permanently.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Sub-view: Paste Text */}
            {subView === "paste" && (
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setSubView(null)} className="text-muted-foreground/40 hover:text-foreground/70 text-xs">← Back</button>
                  <span className="text-xs font-semibold text-foreground">Paste Text</span>
                </div>
                <textarea
                  autoFocus
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your text, data, or notes here…"
                  className="w-full h-28 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 resize-none"
                />
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="self-end px-4 py-1.5 rounded-lg text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-30"
                >
                  Add to context
                </button>
              </div>
            )}

            {/* Sub-view: URL */}
            {subView === "url" && (
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setSubView(null)} className="text-muted-foreground/40 hover:text-foreground/70 text-xs">← Back</button>
                  <span className="text-xs font-semibold text-foreground">Import URL</span>
                </div>
                <input
                  autoFocus
                  type="url"
                  value={urlText}
                  onChange={(e) => setUrlText(e.target.value)}
                  placeholder="https://example.com/article"
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  className="w-full text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30"
                />
                <button
                  onClick={handleUrlSubmit}
                  disabled={!urlText.trim() || loading}
                  className="self-end flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-30"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Fetch & add
                </button>
              </div>
            )}

            {/* Sub-view: Vault picker */}
            {subView === "vault" && ctx.vault.ready && (
              <div className="flex flex-col max-h-[50vh]">
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <button onClick={() => setSubView(null)} className="text-muted-foreground/40 hover:text-foreground/70 text-xs">← Back</button>
                  <span className="text-xs font-semibold text-foreground">Sovereign Vault</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/50">{ctx.vault.count} doc{ctx.vault.count !== 1 ? "s" : ""}</span>
                </div>
                <VaultContextPicker
                  open={true}
                  onOpenChange={() => setSubView(null)}
                  vault={ctx.vault}
                  selectedIds={ctx.selectedVaultIds}
                  onToggle={ctx.toggleVaultDoc}
                  onImportFile={() => fileInputRef.current?.click()}
                  onImportUrl={() => { setSubView("url"); }}
                  anchor={anchor}
                  className="relative w-full shadow-none border-0 rounded-none bg-transparent"
                  inline
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuButton({ icon, label, description, onClick, loading, accent }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] disabled:opacity-50 ${
        accent ? "text-primary" : "text-foreground/80"
      }`}
    >
      <div className={`shrink-0 ${accent ? "text-primary" : "text-muted-foreground/50"}`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground/40 mt-0.5">{description}</p>
      </div>
    </button>
  );
}
