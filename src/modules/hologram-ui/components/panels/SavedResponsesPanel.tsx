/**
 * SavedResponsesPanel — Browse, search, and revisit bookmarked responses
 * Aman-inspired: generous whitespace, golden serif titles, warm earth tones, tranquil rhythm.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Search, BookmarkCheck, Bookmark, Trash2, ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

/* ── Palette — warm earth, Aman-inspired ──────────────────── */
const P = {
  bg: "hsl(28, 12%, 11%)",
  bgGrad: "linear-gradient(180deg, hsl(30, 10%, 15%) 0%, hsl(28, 12%, 11%) 100%)",
  surface: "hsla(30, 8%, 20%, 0.5)",
  surfaceHover: "hsla(38, 20%, 28%, 0.18)",
  border: "hsla(38, 20%, 35%, 0.15)",
  borderLight: "hsla(38, 18%, 40%, 0.1)",
  gold: "hsl(38, 40%, 58%)",
  goldLight: "hsl(38, 45%, 65%)",
  goldMuted: "hsl(38, 28%, 48%)",
  goldBg: "hsla(38, 35%, 50%, 0.08)",
  text: "hsl(35, 18%, 82%)",
  textMuted: "hsl(30, 12%, 58%)",
  textDim: "hsl(30, 10%, 48%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

const GRADE_STYLE: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  A: { color: "hsl(145, 35%, 52%)", bg: "hsla(145, 35%, 52%, 0.1)", icon: "◆", label: "Verified" },
  B: { color: "hsl(38, 45%, 58%)", bg: "hsla(38, 45%, 58%, 0.1)", icon: "◇", label: "Strong" },
  C: { color: "hsl(25, 40%, 55%)", bg: "hsla(25, 40%, 55%, 0.1)", icon: "○", label: "Partial" },
  D: { color: "hsl(0, 30%, 52%)", bg: "hsla(0, 30%, 52%, 0.1)", icon: "△", label: "Ungraded" },
};

interface SavedResponse {
  id: string;
  message_content: string;
  epistemic_grade: string;
  curvature: number;
  iterations: number;
  converged: boolean;
  user_query: string | null;
  created_at: string;
  note: string | null;
}

interface SavedResponsesPanelProps {
  onBack: () => void;
  onLoadResponse?: (content: string, query?: string) => void;
}

export default function SavedResponsesPanel({ onBack, onLoadResponse }: SavedResponsesPanelProps) {
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("saved_responses")
      .select("id, message_content, epistemic_grade, curvature, iterations, converged, user_query, created_at, note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) setResponses(data as SavedResponse[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const filtered = useMemo(() => {
    let list = responses;
    if (gradeFilter) list = list.filter(r => r.epistemic_grade === gradeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.message_content.toLowerCase().includes(q) ||
        (r.user_query?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [responses, gradeFilter, search]);

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from("saved_responses").delete().eq("id", id);
    setResponses(prev => prev.filter(r => r.id !== id));
  }, []);

  const gradeCount = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    responses.forEach(r => { if (counts[r.epistemic_grade] !== undefined) counts[r.epistemic_grade]++; });
    return counts;
  }, [responses]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onBack} />
      <div
        className="relative w-full max-w-lg mx-4 flex flex-col overflow-hidden shadow-2xl animate-scale-in"
        style={{
          maxHeight: "min(88vh, 780px)",
          background: P.bgGrad,
          borderRadius: "20px",
          border: `1px solid ${P.border}`,
          boxShadow: "0 30px 80px -20px hsla(25, 15%, 5%, 0.6)",
        }}
      >
        {/* ── Header — serene, generous ─────────────────────────── */}
        <div className="px-7 pt-7 pb-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: P.textMuted }}
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <span className="text-xs tracking-[0.2em] uppercase" style={{ color: P.textDim, fontFamily: P.font }}>
              {responses.length} {responses.length === 1 ? "moment" : "moments"} saved
            </span>
          </div>

          <h2
            className="text-2xl font-normal tracking-[0.02em] mb-1"
            style={{ fontFamily: P.fontDisplay, color: P.goldLight, lineHeight: "1.3" }}
          >
            Saved Responses
          </h2>
          <p className="text-sm" style={{ color: P.textMuted, lineHeight: "1.6" }}>
            Insights you chose to keep
          </p>
        </div>

        {/* ── Search — understated, warm ────────────────────────── */}
        <div className="px-7 pb-3 flex-shrink-0">
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
            style={{ background: "hsla(30, 8%, 18%, 0.5)", border: `1px solid ${P.borderLight}` }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: P.textDim }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsla(30,10%,45%,0.5)]"
              style={{ color: P.text, fontFamily: P.font }}
            />
          </div>
        </div>

        {/* ── Grade filters — soft pills ────────────────────────── */}
        <div className="px-7 pb-4 flex gap-2 flex-shrink-0 flex-wrap">
          {(["A", "B", "C", "D"] as const).map(g => {
            const s = GRADE_STYLE[g];
            const active = gradeFilter === g;
            const count = gradeCount[g];
            return (
              <button
                key={g}
                onClick={() => setGradeFilter(active ? null : g)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs tracking-wide transition-all"
                style={{
                  background: active ? s.bg : "transparent",
                  color: active ? s.color : P.textDim,
                  border: active ? `1px solid ${s.color}25` : `1px solid ${P.borderLight}`,
                  fontWeight: active ? 500 : 400,
                  opacity: count === 0 && !active ? 0.3 : 1,
                  fontFamily: P.font,
                }}
              >
                {s.label}
                {count > 0 && <span className="opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* ── Thin rule ─────────────────────────────────────────── */}
        <div className="mx-7 mb-2" style={{ height: "1px", background: P.borderLight }} />

        {/* ── Response list ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3" style={{ minHeight: "200px" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${P.gold} transparent transparent transparent` }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
              <Bookmark className="w-7 h-7" style={{ color: P.textDim }} />
              <p className="text-sm leading-relaxed" style={{ color: P.textMuted }}>
                {responses.length === 0
                  ? "Nothing saved yet. Bookmark any response worth revisiting."
                  : "No matches."}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((r, i) => {
                const g = GRADE_STYLE[r.epistemic_grade] ?? GRADE_STYLE.D;
                const isExpanded = expandedId === r.id;
                const preview = r.user_query
                  ? r.user_query.slice(0, 90) + (r.user_query.length > 90 ? "…" : "")
                  : r.message_content.slice(0, 110) + "…";

                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, delay: i * 0.03, ease: [0.23, 1, 0.32, 1] }}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: isExpanded ? "hsla(30, 10%, 17%, 0.6)" : "hsla(30, 8%, 15%, 0.35)",
                      border: `1px solid ${isExpanded ? P.border : "transparent"}`,
                      transition: "background 0.3s ease, border-color 0.3s ease",
                    }}
                  >
                    {/* ── Compact row ──────────────────────────────── */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="w-full flex items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0 mt-0.5 tracking-wide"
                        style={{ background: g.bg, color: g.color }}
                      >
                        {r.epistemic_grade}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed" style={{ color: P.text, lineHeight: "1.6" }}>
                          {preview}
                        </p>
                        <p className="text-xs mt-1.5 tracking-wide" style={{ color: P.textDim }}>
                          {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          {r.converged && " · converged"}
                        </p>
                      </div>
                    </button>

                    {/* ── Expanded content ─────────────────────────── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-2">
                            <div className="mb-4" style={{ height: "1px", background: P.borderLight }} />

                            {r.user_query && (
                              <div className="mb-4">
                                <p
                                  className="text-xs tracking-[0.15em] uppercase mb-2"
                                  style={{ color: P.goldMuted, fontFamily: P.font }}
                                >
                                  Your question
                                </p>
                                <p
                                  className="text-sm leading-relaxed"
                                  style={{ color: P.text, fontFamily: P.fontDisplay, fontStyle: "italic", lineHeight: "1.65" }}
                                >
                                  "{r.user_query}"
                                </p>
                              </div>
                            )}

                            <div
                              className="text-sm leading-relaxed max-h-72 overflow-y-auto pr-1 prose prose-invert max-w-none"
                              style={{
                                color: "hsl(30, 14%, 76%)",
                                fontFamily: P.font,
                                lineHeight: "1.85",
                                ['--tw-prose-headings' as string]: P.goldLight,
                              }}
                            >
                              <ReactMarkdown
                                components={{
                                  h1: ({ children }) => (
                                    <h1
                                      className="text-lg font-normal tracking-[0.03em] mt-5 mb-2"
                                      style={{ fontFamily: P.fontDisplay, color: P.goldLight }}
                                    >
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2
                                      className="text-base font-normal tracking-[0.03em] mt-4 mb-2"
                                      style={{ fontFamily: P.fontDisplay, color: "hsl(38, 35%, 65%)" }}
                                    >
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3
                                      className="text-[13px] tracking-[0.12em] uppercase mt-4 mb-1.5"
                                      style={{ color: P.goldMuted }}
                                    >
                                      {children}
                                    </h3>
                                  ),
                                  p: ({ children }) => (
                                    <p className="mb-3 last:mb-0" style={{ lineHeight: "1.85" }}>{children}</p>
                                  ),
                                  strong: ({ children }) => (
                                    <strong style={{ color: "hsl(38, 25%, 82%)", fontWeight: 500 }}>{children}</strong>
                                  ),
                                  li: ({ children }) => (
                                    <li className="flex gap-2.5 items-start text-sm" style={{ color: "hsl(30, 14%, 76%)" }}>
                                      <span className="flex-shrink-0 mt-[8px]" style={{ color: P.goldMuted, fontSize: "5px" }}>●</span>
                                      <span style={{ lineHeight: "1.8" }}>{children}</span>
                                    </li>
                                  ),
                                }}
                              >
                                {r.message_content.slice(0, 2000)}
                              </ReactMarkdown>
                            </div>

                            {/* ── Actions — minimal, warm ──────────────── */}
                            <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: `1px solid ${P.borderLight}` }}>
                              {onLoadResponse && (
                                <button
                                  onClick={() => onLoadResponse(r.message_content, r.user_query ?? undefined)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs tracking-wider font-medium transition-all hover:bg-white/[0.04]"
                                  style={{ color: P.goldLight, border: `1px solid ${P.border}` }}
                                >
                                  Revisit
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs tracking-wider transition-all hover:bg-red-500/[0.06] ml-auto"
                                style={{ color: "hsl(0, 25%, 50%)" }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
