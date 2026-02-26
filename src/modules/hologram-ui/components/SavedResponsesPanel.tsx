/**
 * SavedResponsesPanel — Browse, search, and revisit bookmarked responses
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Search, BookmarkCheck, Bookmark, Trash2, ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

/* ── Palette (matches HologramAiChat) ─────────────────────── */
const P = {
  bg: "hsl(25, 10%, 14%)",
  bgGrad: "linear-gradient(180deg, hsl(30, 8%, 18%) 0%, hsl(25, 10%, 14%) 100%)",
  surface: "hsla(30, 8%, 22%, 0.8)",
  surfaceHover: "hsla(38, 30%, 30%, 0.25)",
  border: "hsla(38, 30%, 30%, 0.25)",
  borderLight: "hsla(38, 30%, 30%, 0.15)",
  gold: "hsl(38, 50%, 50%)",
  goldLight: "hsl(38, 60%, 60%)",
  goldMuted: "hsl(38, 40%, 45%)",
  text: "hsl(38, 20%, 85%)",
  textMuted: "hsl(30, 10%, 60%)",
  textDim: "hsl(30, 10%, 50%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

const GRADE_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  A: { color: "hsl(140, 50%, 55%)", bg: "hsla(140, 50%, 55%, 0.12)", icon: "◆" },
  B: { color: "hsl(38, 55%, 55%)", bg: "hsla(38, 55%, 55%, 0.12)", icon: "◇" },
  C: { color: "hsl(25, 50%, 55%)", bg: "hsla(25, 50%, 55%, 0.12)", icon: "○" },
  D: { color: "hsl(0, 40%, 55%)", bg: "hsla(0, 40%, 55%, 0.12)", icon: "△" },
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onBack} />
      <div
        className="relative w-full max-w-lg mx-4 flex flex-col overflow-hidden shadow-2xl animate-scale-in"
        style={{
          maxHeight: "min(88vh, 780px)",
          background: P.bgGrad,
          borderRadius: "16px",
          border: `1px solid ${P.border}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${P.borderLight}` }}>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
              style={{ color: P.textMuted }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <BookmarkCheck className="w-4 h-4" style={{ color: P.goldLight }} />
            <h3 className="text-lg font-medium tracking-wide" style={{ fontFamily: P.fontDisplay, color: P.text }}>
              Saved
            </h3>
            <span className="text-sm" style={{ color: P.textDim }}>{responses.length}</span>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg"
            style={{ background: "hsla(30, 8%, 20%, 0.6)", border: `1px solid ${P.borderLight}` }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: P.textDim }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search saved responses…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsla(30,10%,50%,0.5)]"
              style={{ color: P.text, fontFamily: P.font }}
            />
          </div>
        </div>

        {/* Grade filter chips */}
        <div className="px-4 pb-3 flex gap-2 flex-shrink-0">
          {(["A", "B", "C", "D"] as const).map(g => {
            const s = GRADE_STYLE[g];
            const active = gradeFilter === g;
            const count = gradeCount[g];
            return (
              <button
                key={g}
                onClick={() => setGradeFilter(active ? null : g)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  background: active ? s.bg : "transparent",
                  color: active ? s.color : P.textDim,
                  border: active ? `1px solid ${s.color}33` : `1px solid transparent`,
                  opacity: count === 0 && !active ? 0.35 : 1,
                }}
              >
                <span style={{ fontSize: "7px" }}>{s.icon}</span>
                Grade {g}
                {count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Response list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2" style={{ minHeight: "200px" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${P.gold} transparent transparent transparent` }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Bookmark className="w-8 h-8" style={{ color: P.textDim }} />
              <p className="text-sm" style={{ color: P.textMuted }}>
                {responses.length === 0
                  ? "No saved responses yet. Bookmark any high-trust response to revisit it here."
                  : "No matches found."}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((r, i) => {
                const g = GRADE_STYLE[r.epistemic_grade] ?? GRADE_STYLE.D;
                const isExpanded = expandedId === r.id;
                const preview = r.user_query
                  ? r.user_query.slice(0, 80) + (r.user_query.length > 80 ? "…" : "")
                  : r.message_content.slice(0, 100) + "…";

                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="rounded-xl overflow-hidden group"
                    style={{
                      background: isExpanded ? "hsla(30, 8%, 18%, 0.7)" : "hsla(30, 8%, 16%, 0.4)",
                      border: `1px solid ${isExpanded ? P.border : P.borderLight}`,
                    }}
                  >
                    {/* Compact row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold shrink-0 mt-0.5"
                        style={{ background: g.bg, color: g.color }}
                      >
                        <span style={{ fontSize: "7px" }}>{g.icon}</span>
                        {r.epistemic_grade}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug" style={{ color: P.text }}>{preview}</p>
                        <p className="text-xs mt-1" style={{ color: P.textDim }}>
                          {new Date(r.created_at).toLocaleDateString()}
                          {r.converged && " · ✓ converged"}
                          {r.iterations > 0 && ` · ${r.iterations} passes`}
                        </p>
                      </div>
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1" style={{ borderTop: `1px solid ${P.borderLight}` }}>
                            {r.user_query && (
                              <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: "hsla(30, 8%, 25%, 0.5)" }}>
                                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: P.textDim }}>Question</p>
                                <p className="text-sm" style={{ color: P.text }}>{r.user_query}</p>
                              </div>
                            )}

                            <div
                              className="text-sm leading-relaxed max-h-64 overflow-y-auto pr-1 prose prose-invert max-w-none"
                              style={{ color: P.text, fontFamily: P.font }}
                            >
                              <ReactMarkdown>{r.message_content.slice(0, 1500)}</ReactMarkdown>
                            </div>

                            <div className="flex items-center gap-2 mt-3 pt-2" style={{ borderTop: `1px solid ${P.borderLight}` }}>
                              {onLoadResponse && (
                                <button
                                  onClick={() => onLoadResponse(r.message_content, r.user_query ?? undefined)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.06]"
                                  style={{ color: P.goldLight, border: `1px solid ${P.border}` }}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Revisit
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10 ml-auto"
                                style={{ color: "hsl(0, 40%, 55%)" }}
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
