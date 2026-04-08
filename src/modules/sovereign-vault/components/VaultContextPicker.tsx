/**
 * VaultContextPicker — Popover sheet for selecting vault documents as search context.
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Search, FileText, Check, Upload, Link2, Lock, Plus } from "lucide-react";
import type { VaultHandle } from "../hooks/useVault";
import type { VaultDocument } from "../lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vault: VaultHandle;
  selectedIds: string[];
  onToggle: (docId: string) => void;
  onImportFile: () => void;
  onImportUrl: () => void;
  /** Position anchor — "above" for mobile, "below" for desktop */
  anchor?: "above" | "below";
  className?: string;
  /** When true, renders inline without AnimatePresence wrapper and outside-click handler */
  inline?: boolean;
}

function truncateCid(cid: string, len = 8): string {
  return cid.length > len ? cid.slice(0, len) + "…" : cid;
}

function mimeIcon(mime: string | null) {
  return <FileText className="w-4 h-4 text-muted-foreground/60 shrink-0" />;
}

export default function VaultContextPicker({
  open,
  onOpenChange,
  vault,
  selectedIds,
  onToggle,
  onImportFile,
  onImportUrl,
  anchor = "below",
  className = "",
}: Props) {
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  const filtered = vault.documents.filter((d) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      (d.filename || "").toLowerCase().includes(q) ||
      d.cid.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const slideDir = anchor === "above" ? { y: 12 } : { y: -12 };
  const exitDir = anchor === "above" ? { y: 12 } : { y: -12 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, ...slideDir }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, ...exitDir }}
          transition={{ type: "spring", damping: 26, stiffness: 340 }}
          className={`absolute z-[80] w-[320px] max-h-[50vh] rounded-2xl border border-white/[0.08] bg-[hsl(0_0%_8%/0.96)] backdrop-blur-xl shadow-[0_16px_64px_-12px_hsl(0_0%_0%/0.7)] flex flex-col overflow-hidden ${className}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Context Vault</span>
            <span className="ml-auto text-[10px] text-muted-foreground/50">{vault.count} doc{vault.count !== 1 ? "s" : ""}</span>
          </div>

          {!vault.ready ? (
            /* Auth gate */
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <Lock className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground/60">Sign in to access your Sovereign Vault</p>
            </div>
          ) : (
            <>
              {/* Filter bar */}
              {vault.count > 3 && (
                <div className="px-3 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    <input
                      type="text"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Filter documents…"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30"
                    />
                  </div>
                </div>
              )}

              {/* Document list */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Shield className="w-7 h-7 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground/40">
                      {vault.count === 0 ? "Your vault is empty" : "No matching documents"}
                    </p>
                  </div>
                ) : (
                  filtered.map((doc) => {
                    const selected = selectedIds.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        onClick={() => onToggle(doc.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          selected
                            ? "bg-primary/10 text-foreground"
                            : "text-foreground/80 hover:bg-white/[0.04]"
                        }`}
                      >
                        {mimeIcon(doc.mime_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{doc.filename || "Untitled"}</p>
                          <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                            {truncateCid(doc.cid)} · {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            selected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-white/[0.12] text-transparent"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Import actions */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-white/[0.06]">
                <button
                  onClick={() => { onImportFile(); onOpenChange(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground/80 hover:bg-white/[0.04] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import file
                </button>
                <div className="w-px h-5 bg-white/[0.06]" />
                <button
                  onClick={() => { onImportUrl(); onOpenChange(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground/80 hover:bg-white/[0.04] transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Import URL
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
