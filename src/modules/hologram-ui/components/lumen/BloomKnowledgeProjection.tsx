/**
 * BloomKnowledgeProjection — Compact knowledge graph explorer in the bloom
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Displays the user's context triples and recent knowledge as an
 * interactive, scrollable card list with category grouping.
 *
 * @module hologram-ui/components/lumen/BloomKnowledgeProjection
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Brain, Lightbulb, Tag, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";

interface Triple {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
}

export default function BloomKnowledgeProjection() {
  const [triples, setTriples] = useState<Triple[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) { setLoading(false); return; }

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

  if (!triples.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
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
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
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
                transition={{ delay: i * 0.03, ease: [0.23, 1, 0.32, 1] }}
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
    </div>
  );
}
