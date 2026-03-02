/**
 * AmbientCardStack — Proactive contextual cards in the bloom
 * ═══════════════════════════════════════════════════════════════
 *
 * Renders a horizontal scrollable strip of ambient intelligence
 * cards above the projection tabs. Each card can navigate the
 * user to a specific projection on tap.
 *
 * Cards auto-refresh every 60s and dismiss individually.
 *
 * @module hologram-ui/components/lumen/AmbientCardStack
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";
import {
  computeAmbientCards,
  type AmbientCard,
  type AmbientCardType,
} from "@/modules/hologram-ui/engines/AmbientIntelligenceEngine";
import { supabase } from "@/integrations/supabase/client";

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;

const TYPE_ACCENTS: Record<AmbientCardType, string> = {
  upcoming_event: "hsla(0, 55%, 55%, 0.15)",
  trust_request: "hsla(280, 40%, 55%, 0.12)",
  knowledge_insight: "hsla(200, 45%, 55%, 0.12)",
  focus_suggestion: "hsla(38, 45%, 55%, 0.12)",
  greeting: "hsla(38, 30%, 55%, 0.08)",
  reflection: "hsla(260, 35%, 55%, 0.12)",
  streak: "hsla(150, 40%, 55%, 0.12)",
  connection_nudge: "hsla(180, 40%, 55%, 0.12)",
};

const TYPE_BORDER: Record<AmbientCardType, string> = {
  upcoming_event: "hsla(0, 55%, 55%, 0.25)",
  trust_request: "hsla(280, 40%, 55%, 0.2)",
  knowledge_insight: "hsla(200, 45%, 55%, 0.2)",
  focus_suggestion: "hsla(38, 45%, 55%, 0.2)",
  greeting: PP.bloomCardBorder,
  reflection: "hsla(260, 35%, 55%, 0.2)",
  streak: "hsla(150, 40%, 55%, 0.2)",
  connection_nudge: "hsla(180, 40%, 55%, 0.2)",
};

interface AmbientCardStackProps {
  active: boolean;
  onNavigate?: (projection: "conversation" | "trust" | "calendar" | "knowledge") => void;
}

export default function AmbientCardStack({ active, onNavigate }: AmbientCardStackProps) {
  const [cards, setCards] = useState<AmbientCard[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCards = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const result = await computeAmbientCards(user?.id);
      setCards(result);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    fetchCards();
    intervalRef.current = setInterval(fetchCards, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, fetchCards]);

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  const visibleCards = cards.filter(c => !dismissed.has(c.id));

  if (!loaded || visibleCards.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: ORGANIC_EASE }}
      className="overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-4 mb-1.5">
        <Sparkles className="w-3 h-3" style={{ color: PP.accent, opacity: 0.6 }} />
        <span
          style={{
            fontFamily: PP.font,
            fontSize: "9px",
            color: PP.textWhisper,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            opacity: 0.6,
          }}
        >
          Ambient
        </span>
      </div>

      {/* Scrollable card strip */}
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        <AnimatePresence mode="popLayout">
          {visibleCards.map((card, i) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: -10 }}
              transition={{ delay: i * 0.06, ease: ORGANIC_EASE }}
              className="relative flex-shrink-0 rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
              style={{
                minWidth: 180,
                maxWidth: 220,
                background: TYPE_ACCENTS[card.type] || PP.canvasSubtle,
                border: `1px solid ${TYPE_BORDER[card.type] || PP.bloomCardBorder}`,
              }}
            >
              {/* Dismiss */}
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(card.id); }}
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "hsla(0, 0%, 50%, 0.1)" }}
              >
                <X className="w-2.5 h-2.5" style={{ color: PP.textWhisper, opacity: 0.5 }} />
              </button>

              {/* Icon + Title */}
              <div className="flex items-start gap-2 pr-4">
                <span style={{ fontSize: "16px", lineHeight: 1 }}>{card.icon}</span>
                <div className="min-w-0">
                  <p
                    className="leading-tight"
                    style={{
                      fontFamily: PP.font,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: PP.text,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {card.title}
                  </p>
                  <p
                    className="mt-0.5 leading-snug"
                    style={{
                      fontFamily: PP.font,
                      fontSize: "10px",
                      color: PP.textSecondary,
                      opacity: 0.75,
                    }}
                  >
                    {card.subtitle}
                  </p>
                </div>
              </div>

              {/* Action button */}
              {card.action && (
                <button
                  onClick={() => card.action?.projection && onNavigate?.(card.action.projection)}
                  className="flex items-center gap-1 self-start mt-0.5 px-2 py-1 rounded-lg active:scale-95 transition-transform"
                  style={{
                    background: `${PP.accent}10`,
                    border: `1px solid ${PP.accent}18`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: PP.font,
                      fontSize: "9px",
                      fontWeight: 500,
                      color: PP.accent,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {card.action.label}
                  </span>
                  <ArrowRight className="w-2.5 h-2.5" style={{ color: PP.accent, opacity: 0.7 }} />
                </button>
              )}

              {/* Urgency pulse for imminent events */}
              {card.type === "upcoming_event" && card.icon === "🔴" && (
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  style={{
                    border: "1px solid hsla(0, 55%, 55%, 0.4)",
                  }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
