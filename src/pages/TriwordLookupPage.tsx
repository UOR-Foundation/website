/**
 * TriwordLookupPage — Resolve word1.word2.word3 to full canonical identity.
 *
 * Features:
 *   • Autocomplete per dimension (Observer / Observable / Context)
 *   • Instant resolution to hex prefix, breakdown, and triality coordinates
 *   • Database lookup: finds matching derivations, datums, and certificates
 *   • Copy-friendly output for all resolved identifiers
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Copy, Check, ChevronRight, Eye, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import {
  triwordToPrefix,
  triwordBreakdown,
  formatTriword,
  isValidTriword,
  getWordlist,
  triwordSpace,
} from "@/lib/uor-triword";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ───────────────────────────────────────────────────── */

interface ResolvedMatch {
  type: "derivation" | "datum" | "certificate";
  id: string;
  label: string;
  grade?: string;
  iri?: string;
  createdAt?: string;
}

/* ── Component ───────────────────────────────────────────────── */

export default function TriwordLookupPage() {
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [word3, setWord3] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [matches, setMatches] = useState<ResolvedMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const observers = useMemo(() => [...getWordlist("observer")], []);
  const observables = useMemo(() => [...getWordlist("observable")], []);
  const contexts = useMemo(() => [...getWordlist("context")], []);

  const triword = `${word1.toLowerCase()}.${word2.toLowerCase()}.${word3.toLowerCase()}`;
  const valid = isValidTriword(triword);
  const prefix = valid ? triwordToPrefix(triword) : null;
  const breakdown = valid ? triwordBreakdown(triword) : null;
  const display = valid ? formatTriword(triword) : null;

  const copyValue = useCallback((val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // Search database for matching canonical IDs
  const searchDatabase = useCallback(async () => {
    if (!prefix) return;
    setSearching(true);
    setSearched(false);
    setMatches([]);

    try {
      const results: ResolvedMatch[] = [];

      // Search derivations by hex prefix
      const { data: derivations } = await supabase
        .from("uor_derivations")
        .select("derivation_id, original_term, canonical_term, epistemic_grade, result_iri, created_at")
        .ilike("derivation_id", `%${prefix}%`)
        .limit(10);

      if (derivations) {
        for (const d of derivations) {
          results.push({
            type: "derivation",
            id: d.derivation_id,
            label: d.original_term || d.canonical_term,
            grade: d.epistemic_grade,
            iri: d.result_iri,
            createdAt: d.created_at,
          });
        }
      }

      // Search datums by IRI containing the prefix
      const { data: datums } = await supabase
        .from("uor_datums")
        .select("iri, glyph, quantum, created_at")
        .ilike("iri", `%${prefix}%`)
        .limit(10);

      if (datums) {
        for (const d of datums) {
          results.push({
            type: "datum",
            id: d.iri,
            label: `Datum q=${d.quantum}`,
            iri: d.iri,
            createdAt: d.created_at,
          });
        }
      }

      // Search certificates
      const { data: certs } = await supabase
        .from("uor_certificates")
        .select("certificate_id, certifies_iri, issued_at")
        .ilike("certificate_id", `%${prefix}%`)
        .limit(5);

      if (certs) {
        for (const c of certs) {
          results.push({
            type: "certificate",
            id: c.certificate_id,
            label: `Certificate`,
            iri: c.certifies_iri,
            createdAt: c.issued_at,
          });
        }
      }

      setMatches(results);
    } catch (err) {
      console.error("[TriwordLookup] Search failed:", err);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }, [prefix]);

  // Auto-search when triword becomes valid
  useEffect(() => {
    if (valid) {
      const timeout = setTimeout(searchDatabase, 400);
      return () => clearTimeout(timeout);
    } else {
      setMatches([]);
      setSearched(false);
    }
  }, [valid, triword, searchDatabase]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-display font-semibold">Triword Lookup</h1>
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            {triwordSpace().toLocaleString()} addresses
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
          Enter a three-word address to resolve it to its full canonical identity.
          Each word maps to a coordinate: <strong>Observer</strong> · <strong>Observable</strong> · <strong>Context</strong>.
        </p>

        {/* Input */}
        <div className="flex items-center gap-2">
          <WordInput
            value={word1}
            onChange={setWord1}
            wordlist={observers}
            placeholder="observer"
            label="Observer"
          />
          <span className="text-2xl text-muted-foreground font-light select-none pb-5">·</span>
          <WordInput
            value={word2}
            onChange={setWord2}
            wordlist={observables}
            placeholder="observable"
            label="Observable"
          />
          <span className="text-2xl text-muted-foreground font-light select-none pb-5">·</span>
          <WordInput
            value={word3}
            onChange={setWord3}
            wordlist={contexts}
            placeholder="context"
            label="Context"
          />
        </div>

        {/* Resolution panel */}
        <AnimatePresence mode="wait">
          {valid && prefix && breakdown && display && (
            <motion.div
              key="resolved"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl border border-border bg-card p-6 space-y-5"
            >
              {/* Resolved triword */}
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Resolved Address
                </p>
                <p className="text-2xl font-display font-bold tracking-wide">
                  {display}
                </p>
                <p className="text-xs font-mono text-muted-foreground">{triword}</p>
              </div>

              <div className="border-t border-dashed border-border" />

              {/* Coordinates */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: "observer" as const, label: "Observer", desc: "Entity / Who" },
                  { key: "observable" as const, label: "Observable", desc: "Property / What" },
                  { key: "context" as const, label: "Context", desc: "Frame / Where" },
                ]).map(({ key, label, desc }) => (
                  <div key={key} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-base font-semibold capitalize mt-0.5">{breakdown[key]}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-border" />

              {/* Hex prefix */}
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Hash Prefix
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <code className="flex-1 font-mono text-sm">
                    0x{prefix}
                  </code>
                  <button
                    onClick={() => copyValue(`0x${prefix}`, "prefix")}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy hex prefix"
                  >
                    {copied === "prefix" ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  First 3 bytes of the SHA-256 digest. Multiple canonical IDs may share this prefix.
                </p>
              </div>

              {/* Dot-notation copy */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <code className="flex-1 font-mono text-sm">{triword}</code>
                <button
                  onClick={() => copyValue(triword, "triword")}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy triword"
                >
                  {copied === "triword" ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="border-t border-dashed border-border" />

              {/* Database matches */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-muted-foreground" />
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Known Objects
                  </p>
                  {searching && (
                    <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  )}
                </div>

                {searched && matches.length === 0 && !searching && (
                  <p className="text-sm text-muted-foreground italic py-2">
                    No objects found matching this prefix in the knowledge graph.
                  </p>
                )}

                {matches.map((m, i) => (
                  <motion.div
                    key={`${m.type}-${m.id}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="mt-0.5">
                      {m.type === "derivation" && <Eye size={14} className="text-primary" />}
                      {m.type === "datum" && <ChevronRight size={14} className="text-primary" />}
                      {m.type === "certificate" && <ShieldCheck size={14} className="text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {m.type}
                        </span>
                        {m.grade && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Grade {m.grade}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{m.label}</p>
                      <code className="text-[10px] font-mono text-muted-foreground break-all block">
                        {m.id}
                      </code>
                    </div>
                    <button
                      onClick={() => copyValue(m.id, m.id)}
                      className="shrink-0 mt-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied === m.id ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invalid state hint */}
        {(word1 || word2 || word3) && !valid && (
          <p className="text-sm text-muted-foreground">
            {!word1 && "Enter an observer word…"}
            {word1 && !observers.includes(word1.toLowerCase()) && (
              <span className="text-destructive">"{word1}" is not a valid observer word. </span>
            )}
            {word2 && !observables.includes(word2.toLowerCase()) && (
              <span className="text-destructive">"{word2}" is not a valid observable word. </span>
            )}
            {word3 && !contexts.includes(word3.toLowerCase()) && (
              <span className="text-destructive">"{word3}" is not a valid context word. </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── WordInput — autocomplete input for a single dimension ──── */

function WordInput({
  value,
  onChange,
  wordlist,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  wordlist: string[];
  placeholder: string;
  label: string;
}) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!value) return [];
    const lower = value.toLowerCase();
    return wordlist.filter((w) => w.startsWith(lower)).slice(0, 8);
  }, [value, wordlist]);

  const showSuggestions = focused && value.length > 0 && suggestions.length > 0 && !wordlist.includes(value.toLowerCase());

  return (
    <div className="relative flex-1">
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        spellCheck={false}
        autoComplete="off"
      />
      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
          >
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s);
                }}
                className="w-full text-left px-3 py-1.5 text-sm font-mono hover:bg-accent/50 transition-colors"
              >
                <span className="text-primary">{s.slice(0, value.length)}</span>
                <span className="text-muted-foreground">{s.slice(value.length)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
