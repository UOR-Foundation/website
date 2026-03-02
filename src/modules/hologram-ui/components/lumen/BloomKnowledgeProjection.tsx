/**
 * BloomKnowledgeProjection — Compact knowledge graph explorer in the bloom
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Displays the user's context triples and recent knowledge as an
 * interactive, scrollable card list with category grouping.
 * Includes a FAB for manually creating new context triples.
 *
 * @module hologram-ui/components/lumen/BloomKnowledgeProjection
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Lightbulb, Tag, ArrowRight, PlusCircle, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";
import BloomFAB, { type FABAction } from "./BloomFAB";

interface Triple {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
}

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;

export default function BloomKnowledgeProjection() {
  const [triples, setTriples] = useState<Triple[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [subject, setSubject] = useState("");
  const [predicate, setPredicate] = useState("");
  const [object, setObject] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) { setLoading(false); return; }

      setUserId(session.user.id);

      const { data } = await supabase
        .from("messenger_context_graph")
        .select("id, triple_subject, triple_predicate, triple_object, confidence")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!cancelled) {
        setTriples(
          (data ?? []).map(d => ({
            id: d.id,
            subject: d.triple_subject,
            predicate: d.triple_predicate,
            object: d.triple_object,
            confidence: d.confidence,
          }))
        );
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveTriple = useCallback(async () => {
    if (!userId || !subject.trim() || !predicate.trim() || !object.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("messenger_context_graph")
      .insert({
        user_id: userId,
        triple_subject: subject.trim(),
        triple_predicate: predicate.trim(),
        triple_object: object.trim(),
        confidence: 1.0,
        source_type: "manual",
      })
      .select("id, triple_subject, triple_predicate, triple_object, confidence")
      .single();

    if (!error && data) {
      setTriples(prev => [{
        id: data.id,
        subject: data.triple_subject,
        predicate: data.triple_predicate,
        object: data.triple_object,
        confidence: data.confidence,
      }, ...prev]);
      setSubject("");
      setPredicate("");
      setObject("");
      setShowForm(false);
    }
    setSaving(false);
  }, [userId, subject, predicate, object]);

  const fabActions: FABAction[] = useMemo(() => [
    {
      id: "new-triple",
      label: "New Triple",
      icon: PlusCircle,
      onTap: () => setShowForm(true),
    },
  ], []);

  // Group by predicate
  const grouped = useMemo(() => {
    const map: Record<string, Triple[]> = {};
    triples.forEach(t => {
      const key = t.predicate;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [triples]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: `${PP.accent}30`, borderTopColor: PP.accent }}
        />
      </div>
    );
  }

  if (!triples.length && !showForm) {
    return (
      <div className="flex-1 relative flex flex-col items-center justify-center gap-4 px-8">
        <Brain className="w-10 h-10" strokeWidth={0.8} style={{ color: PP.textWhisper, opacity: 0.3 }} />
        <p
          className="text-center leading-relaxed"
          style={{ fontFamily: PP.fontDisplay, fontSize: "18px", fontWeight: 300, color: PP.textSecondary }}
        >
          Your knowledge graph is forming
        </p>
        <p
          className="text-center"
          style={{ fontFamily: PP.font, fontSize: "13px", color: PP.textWhisper, maxWidth: 240 }}
        >
          As you converse with Lumen, context triples are learned and stored here as your personal knowledge web.
        </p>
        <BloomFAB actions={fabActions} />
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-y-auto px-4 py-3 space-y-4">
      {/* Inline create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ ease: ORGANIC_EASE }}
            className="rounded-xl p-4 space-y-3"
            style={{
              background: PP.canvasSubtle,
              border: `1px solid ${PP.accent}25`,
              boxShadow: `0 4px 20px ${PP.accent}10`,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontFamily: PP.font,
                  fontSize: "12px",
                  fontWeight: 600,
                  color: PP.accent,
                  letterSpacing: "0.02em",
                }}
              >
                New Context Triple
              </span>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg active:scale-90 transition-transform"
              >
                <X className="w-4 h-4" strokeWidth={1.5} style={{ color: PP.textWhisper }} />
              </button>
            </div>

            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject (e.g. User)"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{
                fontFamily: PP.font,
                background: `${PP.canvas}`,
                border: `1px solid ${PP.bloomCardBorder}`,
                color: PP.text,
              }}
            />
            <input
              value={predicate}
              onChange={e => setPredicate(e.target.value)}
              placeholder="Predicate (e.g. interested_in)"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{
                fontFamily: PP.font,
                background: `${PP.canvas}`,
                border: `1px solid ${PP.bloomCardBorder}`,
                color: PP.text,
              }}
            />
            <input
              value={object}
              onChange={e => setObject(e.target.value)}
              placeholder="Object (e.g. mathematics)"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              onKeyDown={e => e.key === "Enter" && handleSaveTriple()}
              style={{
                fontFamily: PP.font,
                background: `${PP.canvas}`,
                border: `1px solid ${PP.bloomCardBorder}`,
                color: PP.text,
              }}
            />

            <button
              onClick={handleSaveTriple}
              disabled={saving || !subject.trim() || !predicate.trim() || !object.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl active:scale-[0.97] transition-transform disabled:opacity-40"
              style={{
                background: PP.accent,
                color: PP.canvas,
                fontFamily: PP.font,
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <Check className="w-4 h-4" strokeWidth={2} />
              {saving ? "Saving…" : "Add Triple"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: PP.canvasSubtle, border: `1px solid ${PP.bloomCardBorder}` }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4" strokeWidth={1.3} style={{ color: PP.accent }} />
          <span style={{ fontFamily: PP.font, fontSize: "13px", color: PP.text }}>
            {triples.length} knowledge triple{triples.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Tag className="w-3 h-3" strokeWidth={1.3} style={{ color: PP.textWhisper, opacity: 0.5 }} />
          <span style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper }}>
            {grouped.length} categories
          </span>
        </div>
      </div>

      {/* Grouped triples */}
      {grouped.map(([predicate, items]) => (
        <div key={predicate}>
          <p
            className="mb-2 px-1"
            style={{
              fontFamily: PP.font,
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: PP.accentMuted,
              opacity: 0.7,
            }}
          >
            {predicate}
          </p>
          <div className="space-y-1.5">
            {items.map((triple, i) => (
              <motion.div
                key={triple.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, ease: ORGANIC_EASE }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{ background: PP.canvasSubtle, border: `1px solid ${PP.bloomCardBorder}` }}
              >
                <span
                  className="truncate"
                  style={{ fontFamily: PP.font, fontSize: "12px", color: PP.text, flex: "1 1 auto" }}
                >
                  {triple.subject}
                </span>
                <ArrowRight className="w-3 h-3 flex-shrink-0" strokeWidth={1.3} style={{ color: PP.textWhisper, opacity: 0.4 }} />
                <span
                  className="truncate"
                  style={{ fontFamily: PP.font, fontSize: "12px", color: PP.accent, flex: "1 1 auto", textAlign: "right" }}
                >
                  {triple.object}
                </span>
                {/* Confidence dot */}
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: triple.confidence >= 0.8
                      ? "hsla(150, 45%, 55%, 0.7)"
                      : triple.confidence >= 0.5
                        ? "hsla(38, 50%, 55%, 0.7)"
                        : "hsla(0, 40%, 55%, 0.5)",
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* FAB */}
      <BloomFAB actions={fabActions} />
    </div>
  );
}
