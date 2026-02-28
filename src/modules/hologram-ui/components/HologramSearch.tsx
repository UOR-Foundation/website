/**
 * HologramSearch — A beautiful, Google-like universal search overlay.
 * ════════════════════════════════════════════════════════════════════
 *
 * Triggered globally by ⌘K (or Ctrl+K). Provides:
 *   • Triword address resolution (word1.word2.word3)
 *   • Keyword search across derivations, datums, and certificates
 *   • Instant autocomplete for triword dimensions
 *   • Beautiful, centered layout inspired by Google's simplicity
 *
 * Design: Full-screen glass overlay with a single, prominent search bar
 * and results that fade in below — all in the hologram aesthetic.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Copy, Check, Eye, ShieldCheck, ChevronRight, Sparkles, Globe, Command } from "lucide-react";
import { KP } from "@/modules/hologram-os/kernel-palette";
import {
  triwordToPrefix,
  triwordBreakdown,
  formatTriword,
  isValidTriword,
  getWordlist,
  triwordSpace,
  canonicalToTriword,
} from "@/lib/uor-triword";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ───────────────────────────────────────────────────── */

interface SearchResult {
  type: "triword" | "derivation" | "datum" | "certificate" | "hint";
  id: string;
  title: string;
  subtitle?: string;
  grade?: string;
  iri?: string;
  triword?: string;
}

/* ── Singleton open state (global trigger) ────────────────────── */

type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();
let globalOpen = false;

export function openHologramSearch() {
  globalOpen = true;
  listeners.forEach((l) => l(true));
}

export function closeHologramSearch() {
  globalOpen = false;
  listeners.forEach((l) => l(false));
}

function useHologramSearchOpen() {
  const [open, setOpen] = useState(globalOpen);
  useEffect(() => {
    const listener: Listener = (v) => setOpen(v);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  return [open, setOpen] as const;
}

/* ── Component ───────────────────────────────────────────────── */

export default function HologramSearch() {
  const [open, setOpen] = useHologramSearchOpen();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const observers = useMemo(() => [...getWordlist("observer")], []);
  const observables = useMemo(() => [...getWordlist("observable")], []);
  const contexts = useMemo(() => [...getWordlist("context")], []);

  // ── Global ⌘K shortcut ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          closeHologramSearch();
          setQuery("");
          setResults([]);
        } else {
          openHologramSearch();
        }
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        closeHologramSearch();
        setQuery("");
        setResults([]);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0); }, [results]);

  // ── Copy helper ──
  const copyValue = useCallback((val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // ── Search logic ──
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);

    const trimmed = q.trim().toLowerCase();
    const newResults: SearchResult[] = [];

    // 1. Check if it's a valid triword
    if (isValidTriword(trimmed)) {
      const prefix = triwordToPrefix(trimmed)!;
      const breakdown = triwordBreakdown(trimmed)!;
      const display = formatTriword(trimmed);

      newResults.push({
        type: "triword",
        id: `triword:${trimmed}`,
        title: display,
        subtitle: `0x${prefix} · Observer: ${breakdown.observer} · Observable: ${breakdown.observable} · Context: ${breakdown.context}`,
        triword: trimmed,
      });
    }

    // 2. Autocomplete triword suggestions
    const dotParts = trimmed.split(".");
    if (dotParts.length <= 3 && dotParts.length >= 1) {
      const lastPart = dotParts[dotParts.length - 1];
      if (lastPart && !isValidTriword(trimmed)) {
        const dimension = dotParts.length === 1 ? "observer" : dotParts.length === 2 ? "observable" : "context";
        const wordlist = dimension === "observer" ? observers : dimension === "observable" ? observables : contexts;
        const matches = wordlist.filter((w) => w.startsWith(lastPart)).slice(0, 4);

        for (const match of matches) {
          const partial = [...dotParts.slice(0, -1), match];
          // If we have a full 3-word suggestion, show it
          if (partial.length === 3) {
            const tw = partial.join(".");
            if (isValidTriword(tw)) {
              const display = formatTriword(tw);
              const prefix = triwordToPrefix(tw)!;
              newResults.push({
                type: "hint",
                id: `hint:${tw}`,
                title: display,
                subtitle: `Address: 0x${prefix}`,
                triword: tw,
              });
            }
          } else {
            newResults.push({
              type: "hint",
              id: `hint:${partial.join(".")}`,
              title: partial.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" · ") + " · …",
              subtitle: `${dimension}: ${match} — continue typing`,
            });
          }
        }
      }
    }

    // 3. Database search by keyword
    try {
      // Search derivations
      const { data: derivations } = await supabase
        .from("uor_derivations")
        .select("derivation_id, original_term, canonical_term, epistemic_grade, result_iri, created_at")
        .or(`original_term.ilike.%${trimmed}%,canonical_term.ilike.%${trimmed}%,derivation_id.ilike.%${trimmed}%`)
        .limit(6);

      if (derivations) {
        for (const d of derivations) {
          const tw = canonicalToTriword(d.derivation_id);
          newResults.push({
            type: "derivation",
            id: d.derivation_id,
            title: d.original_term || d.canonical_term,
            subtitle: formatTriword(tw),
            grade: d.epistemic_grade,
            iri: d.result_iri,
            triword: tw,
          });
        }
      }

      // Search datums by IRI
      const { data: datums } = await supabase
        .from("uor_datums")
        .select("iri, glyph, value, quantum, total_stratum, created_at")
        .or(`iri.ilike.%${trimmed}%,glyph.eq.${trimmed}`)
        .limit(6);

      if (datums) {
        for (const d of datums) {
          const tw = canonicalToTriword(d.iri);
          newResults.push({
            type: "datum",
            id: d.iri,
            title: `${d.glyph}  value=${d.value}  q=${d.quantum}`,
            subtitle: `${formatTriword(tw)} · stratum ${d.total_stratum}`,
            iri: d.iri,
            triword: tw,
          });
        }
      }

      // Search certificates
      const { data: certs } = await supabase
        .from("uor_certificates")
        .select("certificate_id, certifies_iri, issued_at")
        .or(`certificate_id.ilike.%${trimmed}%,certifies_iri.ilike.%${trimmed}%`)
        .limit(4);

      if (certs) {
        for (const c of certs) {
          newResults.push({
            type: "certificate",
            id: c.certificate_id,
            title: "Certificate",
            subtitle: c.certifies_iri,
            iri: c.certifies_iri,
          });
        }
      }
    } catch (err) {
      console.error("[HologramSearch] DB search failed:", err);
    }

    setResults(newResults);
    setSearching(false);
  }, [observers, observables, contexts]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => performSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, open, performSearch]);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      const r = results[selectedIdx];
      if (r?.triword) {
        setQuery(r.triword);
      } else if (r?.id) {
        copyValue(r.id, r.id);
      }
    }
  }, [results, selectedIdx, copyValue]);

  // Scroll selected result into view
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const el = container.children[selectedIdx] as HTMLElement;
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIdx]);

  if (!open) return null;

  const iconForType = (type: SearchResult["type"]) => {
    switch (type) {
      case "triword": return <Globe size={16} style={{ color: KP.gold }} />;
      case "derivation": return <Eye size={16} style={{ color: KP.gold }} />;
      case "datum": return <ChevronRight size={16} style={{ color: KP.gold }} />;
      case "certificate": return <ShieldCheck size={16} style={{ color: KP.green }} />;
      case "hint": return <Sparkles size={14} style={{ color: KP.muted }} />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="hologram-search-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center"
        style={{ background: "hsla(25, 8%, 4%, 0.92)", backdropFilter: "blur(24px)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeHologramSearch();
            setQuery("");
            setResults([]);
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-2xl mt-[18vh]"
        >
          {/* ── Branding ── */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ fontFamily: KP.serif, color: KP.gold }}
            >
              Hologram
            </h1>
            <p className="text-xs mt-2 tracking-widest uppercase" style={{ color: KP.muted }}>
              {triwordSpace().toLocaleString()} addresses · Universal Search
            </p>
          </div>

          {/* ── Search Bar ── */}
          <div
            className="relative rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: "hsla(25, 10%, 12%, 0.8)",
              border: `1px solid ${query ? "hsla(38, 30%, 55%, 0.25)" : "hsla(38, 12%, 70%, 0.1)"}`,
              boxShadow: query
                ? "0 8px 40px hsla(38, 40%, 20%, 0.3), 0 0 0 1px hsla(38, 30%, 55%, 0.1)"
                : "0 4px 24px hsla(0, 0%, 0%, 0.3)",
            }}
          >
            <div className="flex items-center gap-3 px-5 py-4">
              <Search size={20} style={{ color: query ? KP.gold : KP.muted, flexShrink: 0, transition: "color 0.2s" }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search triwords, IRIs, derivations, or keywords…"
                className="flex-1 bg-transparent border-none outline-none text-base font-light"
                style={{ color: KP.text, fontFamily: KP.font }}
                spellCheck={false}
                autoComplete="off"
              />
              {searching && (
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                  style={{ borderColor: `${KP.gold}`, borderTopColor: "transparent" }}
                />
              )}
              {query && (
                <button
                  onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
                  className="flex-shrink-0 transition-colors"
                  style={{ color: KP.muted }}
                >
                  <X size={16} />
                </button>
              )}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] flex-shrink-0"
                style={{ color: KP.muted, background: "hsla(38, 8%, 50%, 0.08)", border: `1px solid hsla(38, 12%, 70%, 0.06)` }}
              >
                <Command size={10} />K
              </div>
            </div>
          </div>

          {/* ── Results ── */}
          <AnimatePresence mode="wait">
            {results.length > 0 && (
              <motion.div
                key="results"
                ref={resultsRef}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="mt-3 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto"
                style={{
                  background: "hsla(25, 10%, 10%, 0.85)",
                  border: "1px solid hsla(38, 12%, 70%, 0.08)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {results.map((r, i) => (
                  <motion.button
                    key={r.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors duration-150"
                    style={{
                      background: i === selectedIdx ? "hsla(38, 15%, 50%, 0.08)" : "transparent",
                      borderBottom: i < results.length - 1 ? "1px solid hsla(38, 12%, 70%, 0.04)" : "none",
                    }}
                    onClick={() => {
                      if (r.triword) {
                        setQuery(r.triword);
                      } else if (r.id) {
                        copyValue(r.id, r.id);
                      }
                    }}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "hsla(38, 12%, 50%, 0.06)" }}>
                      {iconForType(r.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: KP.text }}>
                          {r.title}
                        </span>
                        {r.grade && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: "hsla(38, 40%, 50%, 0.12)", color: KP.gold }}
                          >
                            {r.grade}
                          </span>
                        )}
                        <span
                          className="text-[10px] uppercase tracking-wider font-medium"
                          style={{ color: KP.muted }}
                        >
                          {r.type}
                        </span>
                      </div>
                      {r.subtitle && (
                        <p className="text-xs truncate mt-0.5" style={{ color: KP.muted }}>
                          {r.subtitle}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyValue(r.triword || r.id, r.id);
                      }}
                      className="flex-shrink-0 transition-colors p-1 rounded"
                      style={{ color: KP.muted }}
                    >
                      {copied === r.id ? <Check size={14} style={{ color: KP.green }} /> : <Copy size={14} />}
                    </button>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Empty state hints ── */}
          {!query && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-center space-y-3"
            >
              <div className="flex items-center justify-center gap-6 text-xs" style={{ color: KP.muted }}>
                <span>Try: <span className="font-mono" style={{ color: KP.gold }}>oak.calm.meadow</span></span>
                <span className="opacity-30">·</span>
                <span>Try: <span className="font-mono" style={{ color: KP.gold }}>falcon.swift.ridge</span></span>
                <span className="opacity-30">·</span>
                <span>Try: <span className="font-mono" style={{ color: KP.gold }}>crystal</span></span>
              </div>
            </motion.div>
          )}

          {/* ── No results state ── */}
          {query && !searching && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center"
            >
              <p className="text-sm" style={{ color: KP.muted }}>
                No objects found for "<span style={{ color: KP.text }}>{query}</span>"
              </p>
              <p className="text-xs mt-1" style={{ color: KP.dim }}>
                Try a triword address, IRI, derivation ID, or keyword
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
