/**
 * LimbicProjection — Emotional Memory Landscape
 * ═══════════════════════════════════════════════
 *
 * Visualizes the agent's emotional memory space as a living
 * scatter plot where:
 *   - X-axis = Valence (negative ← → positive)
 *   - Y-axis = Arousal (calm ← → excited)
 *   - Dot size = Importance
 *   - Dot color = Emotion classification (Plutchik)
 *   - Pulse = Current emotional state cursor
 *
 * This is the agent's "mood ring" — a window into its
 * inner coherence state and emotional memory landscape.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ProjectionShell from "../shell/ProjectionShell";
import {
  deriveVAD,
  classifyEmotion,
  emotionalIntensity,
  vadSimilarity,
  type VADVector,
} from "@/modules/uns/core/hologram/lenses/limbic";

// ── Plutchik Emotion Colors ──────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  joy: "hsl(48, 95%, 60%)",
  trust: "hsl(140, 70%, 50%)",
  serenity: "hsl(200, 60%, 70%)",
  acceptance: "hsl(170, 50%, 55%)",
  anger: "hsl(0, 85%, 55%)",
  fear: "hsl(270, 60%, 50%)",
  disgust: "hsl(90, 40%, 40%)",
  sadness: "hsl(220, 60%, 45%)",
};

interface MemoryDot {
  id: string;
  memoryCid: string;
  valence: number;
  arousal: number;
  dominance: number;
  importance: number;
  emotion: string;
  color: string;
  summary: string | null;
  createdAt: string;
}

interface LimbicProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function LimbicProjection({ open, preload, onClose }: LimbicProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="limbic">
      <LimbicContent />
    </ProjectionShell>
  );
}

function LimbicContent() {
  const [memories, setMemories] = useState<MemoryDot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentVAD, setCurrentVAD] = useState<VADVector>({ valence: 0, arousal: 0.5, dominance: 0.5 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load memories with VAD data
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("agent_memories")
        .select("id, memory_cid, valence, arousal, dominance, importance, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (data) {
        const dots: MemoryDot[] = data.map((m) => {
          const vad: VADVector = {
            valence: Number(m.valence) || 0,
            arousal: Number(m.arousal) || 0.5,
            dominance: Number(m.dominance) || 0.5,
          };
          const emotion = classifyEmotion(vad);
          return {
            id: m.id,
            memoryCid: m.memory_cid,
            valence: vad.valence,
            arousal: vad.arousal,
            dominance: vad.dominance,
            importance: Number(m.importance) || 0.5,
            emotion,
            color: EMOTION_COLORS[emotion] || "hsl(0, 0%, 50%)",
            summary: m.summary,
            createdAt: m.created_at,
          };
        });
        setMemories(dots);
      }
      setLoading(false);
    })();
  }, []);

  // Emotion distribution stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalIntensity = 0;
    for (const m of memories) {
      counts[m.emotion] = (counts[m.emotion] || 0) + 1;
      totalIntensity += emotionalIntensity({ valence: m.valence, arousal: m.arousal, dominance: m.dominance });
    }
    const avgIntensity = memories.length ? totalIntensity / memories.length : 0;
    const dominant = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    return {
      total: memories.length,
      avgIntensity: avgIntensity.toFixed(2),
      dominantEmotion: dominant?.[0] || "neutral",
      dominantCount: dominant?.[1] || 0,
      distribution: counts,
    };
  }, [memories]);

  const hoveredMemory = useMemo(() => {
    if (!hoveredId) return null;
    return memories.find((m) => m.id === hoveredId) || null;
  }, [hoveredId, memories]);

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Limbic Landscape</h2>
          <p className="text-xs text-muted-foreground">
            Emotional memory space · {stats.total} memories
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {stats.dominantEmotion}
          </span>
          <span>avg intensity: {stats.avgIntensity}</span>
        </div>
      </div>

      {/* Main scatter plot */}
      <div
        ref={canvasRef}
        className="relative flex-1 rounded-xl border border-border/30 bg-background/50 backdrop-blur-sm overflow-hidden"
        style={{ minHeight: 300 }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <>
            {/* Axis labels */}
            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute left-2 top-2 text-[10px] text-muted-foreground/40">excited</span>
              <span className="absolute left-2 bottom-2 text-[10px] text-muted-foreground/40">calm</span>
              <span className="absolute right-2 bottom-2 text-[10px] text-muted-foreground/40">positive</span>
              <span className="absolute left-2 bottom-2 text-[10px] text-muted-foreground/40 ml-12">negative</span>

              {/* Center crosshair */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/20" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border/20" />
            </div>

            {/* Memory dots */}
            {memories.map((m) => {
              // Map valence [-1, 1] → [5%, 95%] x-position
              const x = ((m.valence + 1) / 2) * 90 + 5;
              // Map arousal [0, 1] → [95%, 5%] y-position (inverted: high arousal = top)
              const y = (1 - m.arousal) * 90 + 5;
              // Size based on importance
              const size = 6 + m.importance * 12;
              const isHovered = hoveredId === m.id;

              return (
                <motion.div
                  key={m.id}
                  className="absolute rounded-full cursor-pointer"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: size,
                    height: size,
                    backgroundColor: m.color,
                    opacity: isHovered ? 1 : 0.6,
                    transform: "translate(-50%, -50%)",
                    boxShadow: isHovered
                      ? `0 0 12px ${m.color}, 0 0 24px ${m.color}40`
                      : `0 0 4px ${m.color}40`,
                    zIndex: isHovered ? 10 : 1,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: isHovered ? 1.8 : 1,
                    opacity: isHovered ? 1 : 0.6,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              );
            })}

            {/* Current emotional state cursor */}
            <motion.div
              className="absolute rounded-full border-2 border-primary"
              style={{
                left: `${((currentVAD.valence + 1) / 2) * 90 + 5}%`,
                top: `${(1 - currentVAD.arousal) * 90 + 5}%`,
                width: 16,
                height: 16,
                transform: "translate(-50%, -50%)",
                zIndex: 20,
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </>
        )}

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredMemory && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute bottom-3 left-3 right-3 p-3 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50 z-30"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: hoveredMemory.color }}
                />
                <span className="text-xs font-medium text-foreground capitalize">
                  {hoveredMemory.emotion}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(hoveredMemory.createdAt).toLocaleDateString()}
                </span>
              </div>
              {hoveredMemory.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {hoveredMemory.summary}
                </p>
              )}
              <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground/70">
                <span>V: {hoveredMemory.valence.toFixed(2)}</span>
                <span>A: {hoveredMemory.arousal.toFixed(2)}</span>
                <span>D: {hoveredMemory.dominance.toFixed(2)}</span>
                <span>importance: {hoveredMemory.importance.toFixed(2)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emotion distribution bar */}
      <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
        {Object.entries(stats.distribution)
          .sort(([, a], [, b]) => b - a)
          .map(([emotion, count]) => (
            <motion.div
              key={emotion}
              className="relative group cursor-default"
              style={{
                flex: count,
                backgroundColor: EMOTION_COLORS[emotion] || "hsl(0, 0%, 30%)",
                opacity: 0.7,
              }}
              whileHover={{ opacity: 1 }}
              title={`${emotion}: ${count}`}
            >
              {count > 3 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white/80">
                  {emotion}
                </span>
              )}
            </motion.div>
          ))}
      </div>
    </div>
  );
}
