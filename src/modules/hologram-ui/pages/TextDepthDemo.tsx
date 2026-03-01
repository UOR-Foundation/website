/**
 * TextDepthDemo — Side-by-side comparison of three depth exploration models
 * ═════════════════════════════════════════════════════════════════════════
 * Temporary page for visual comparison. Delete after selection.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Sample response text with annotated terms ────────────────────────

interface Term {
  text: string;
  depth: string;
  trust: number;
  followUp: string;
}

const TERMS: Record<string, Term> = {
  "quantum coherence": {
    text: "quantum coherence",
    depth: "Quantum coherence refers to the ability of quantum states to exist in superposition, maintaining phase relationships between components. In biological systems, this has been observed in photosynthesis, where energy transfer achieves near-perfect efficiency through coherent quantum dynamics.",
    trust: 0.91,
    followUp: "How does quantum coherence relate to consciousness?",
  },
  "topological confinement": {
    text: "topological confinement",
    depth: "A mathematical framework where system behavior is bounded by the shape of its configuration space rather than by rules or filters. Like water confined by the walls of a vessel, the AI can only move within paths that preserve user sovereignty. The boundaries are structural, not behavioral.",
    trust: 0.94,
    followUp: "What makes topological boundaries more reliable than rule-based ones?",
  },
  "epistemic grade": {
    text: "epistemic grade",
    depth: "A measure of knowledge quality ranging from Grade A (formally verified) through Grade D (speculative). Each claim in a response carries its own grade, creating transparency about what the system truly knows versus what it infers or estimates.",
    trust: 0.97,
    followUp: "How are epistemic grades computed?",
  },
  "observer field": {
    text: "observer field",
    depth: "In this framework, the observer is not passive but constitutive. The observer field defines what can be seen, measured, and known within a given context. It is the lens through which raw data becomes meaningful information, shaped by attention, intention, and prior understanding.",
    trust: 0.88,
    followUp: "How does the observer field affect AI reasoning?",
  },
};

const SAMPLE_TEXT_PARTS = [
  "The system operates through ",
  "quantum coherence",
  ", where information flows are bounded by ",
  "topological confinement",
  " to ensure safety. Every claim carries an ",
  "epistemic grade",
  " that reflects genuine certainty, not confidence theater. The ",
  "observer field",
  " shapes how understanding emerges from raw data, creating a living dialogue between human attention and machine intelligence.",
];

const TERM_KEYS = Object.keys(TERMS);

// ═══════════════════════════════════════════════════════════════════════
// Model 1: Inline Expansion
// ═══════════════════════════════════════════════════════════════════════

function InlineExpansion() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <p style={{ lineHeight: 2, color: "hsla(30, 10%, 75%, 0.85)", fontSize: 15, fontFamily: "'Playfair Display', serif" }}>
        {SAMPLE_TEXT_PARTS.map((part, i) => {
          const term = TERMS[part];
          if (!term) return <span key={i}>{part}</span>;

          const isOpen = expanded === part;
          return (
            <span key={i} className="inline">
              <span
                onClick={() => setExpanded(isOpen ? null : part)}
                className="cursor-pointer transition-colors duration-300"
                style={{
                  color: isOpen ? "hsla(38, 45%, 65%, 0.95)" : "hsla(38, 30%, 65%, 0.75)",
                  borderBottom: `1px solid hsla(38, 30%, 55%, ${isOpen ? 0.4 : 0.15})`,
                  paddingBottom: 1,
                }}
              >
                {part}
              </span>
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="block overflow-hidden"
                    style={{ marginTop: 8, marginBottom: 12 }}
                  >
                    <div
                      className="rounded-lg"
                      style={{
                        padding: "14px 18px",
                        background: "hsla(38, 15%, 12%, 0.5)",
                        borderLeft: "2px solid hsla(38, 40%, 55%, 0.25)",
                      }}
                    >
                      <p style={{
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: "hsla(30, 10%, 70%, 0.7)",
                        fontFamily: "'DM Sans', sans-serif",
                        margin: 0,
                      }}>
                        {term.depth}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span style={{
                          fontSize: 10,
                          color: "hsla(38, 30%, 55%, 0.4)",
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: "0.1em",
                        }}>
                          Trust: {(term.trust * 100).toFixed(0)}%
                        </span>
                        <span
                          className="cursor-pointer transition-opacity hover:opacity-100"
                          style={{
                            fontSize: 11,
                            color: "hsla(38, 35%, 60%, 0.5)",
                            fontFamily: "'Playfair Display', serif",
                            fontStyle: "italic",
                          }}
                          onClick={(e) => { e.stopPropagation(); }}
                        >
                          {term.followUp} →
                        </span>
                      </div>
                    </div>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          );
        })}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Model 2: Contextual Bloom
// ═══════════════════════════════════════════════════════════════════════

function ContextualBloom() {
  const [bloom, setBloom] = useState<{ term: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTermClick = useCallback((term: string, e: React.MouseEvent) => {
    if (bloom?.term === term) {
      setBloom(null);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBloom({ term, x, y });
  }, [bloom]);

  // Close on outside click
  useEffect(() => {
    if (!bloom) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".bloom-card")) setBloom(null);
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 50);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [bloom]);

  const termData = bloom ? TERMS[bloom.term] : null;

  return (
    <div ref={containerRef} className="relative">
      <p style={{ lineHeight: 2, color: "hsla(30, 10%, 75%, 0.85)", fontSize: 15, fontFamily: "'Playfair Display', serif" }}>
        {SAMPLE_TEXT_PARTS.map((part, i) => {
          const term = TERMS[part];
          if (!term) return <span key={i}>{part}</span>;
          const isActive = bloom?.term === part;
          return (
            <span
              key={i}
              onClick={(e) => handleTermClick(part, e)}
              className="cursor-pointer transition-all duration-300"
              style={{
                color: isActive ? "hsla(38, 50%, 68%, 1)" : "hsla(38, 25%, 65%, 0.7)",
                textShadow: isActive ? "0 0 20px hsla(38, 50%, 55%, 0.3)" : "none",
              }}
            >
              {part}
            </span>
          );
        })}
      </p>

      {/* Bloom overlay */}
      <AnimatePresence>
        {bloom && termData && (
          <motion.div
            className="bloom-card absolute z-50"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              left: Math.min(bloom.x - 140, 160),
              top: bloom.y + 16,
              width: 300,
              transformOrigin: `${bloom.x < 200 ? "left" : "center"} top`,
            }}
          >
            {/* Radial glow at bloom point */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 120,
                height: 120,
                left: bloom.x < 200 ? -20 : 110,
                top: -50,
                borderRadius: "50%",
                background: "radial-gradient(circle, hsla(38, 50%, 55%, 0.08) 0%, transparent 70%)",
              }}
            />

            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "hsla(25, 10%, 10%, 0.92)",
                border: "1px solid hsla(38, 30%, 45%, 0.12)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 20px 60px hsla(0, 0%, 0%, 0.4), 0 0 40px hsla(38, 40%, 50%, 0.04)",
              }}
            >
              <div style={{ padding: "16px 18px" }}>
                {/* Term header */}
                <div className="flex items-center justify-between mb-3">
                  <span style={{
                    fontSize: 11,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "hsla(38, 35%, 60%, 0.6)",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}>
                    {bloom.term}
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "hsla(38, 25%, 55%, 0.35)",
                    letterSpacing: "0.08em",
                  }}>
                    {(termData.trust * 100).toFixed(0)}% trust
                  </span>
                </div>

                {/* Depth text */}
                <p style={{
                  fontSize: 12.5,
                  lineHeight: 1.75,
                  color: "hsla(30, 10%, 72%, 0.75)",
                  fontFamily: "'Playfair Display', serif",
                  margin: 0,
                }}>
                  {termData.depth}
                </p>

                {/* Follow-up */}
                <div
                  className="mt-4 pt-3 cursor-pointer group"
                  style={{ borderTop: "1px solid hsla(38, 20%, 40%, 0.08)" }}
                >
                  <span
                    className="transition-colors duration-200"
                    style={{
                      fontSize: 11,
                      fontFamily: "'Playfair Display', serif",
                      fontStyle: "italic",
                      color: "hsla(38, 35%, 60%, 0.4)",
                    }}
                  >
                    Go deeper: {termData.followUp}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Model 3: Depth Thread
// ═══════════════════════════════════════════════════════════════════════

function DepthThread() {
  const [threads, setThreads] = useState<string[]>([]);

  const toggleThread = (term: string) => {
    setThreads(prev =>
      prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]
    );
  };

  return (
    <div>
      <p style={{ lineHeight: 2, color: "hsla(30, 10%, 75%, 0.85)", fontSize: 15, fontFamily: "'Playfair Display', serif" }}>
        {SAMPLE_TEXT_PARTS.map((part, i) => {
          const term = TERMS[part];
          if (!term) return <span key={i}>{part}</span>;
          const isThreaded = threads.includes(part);
          return (
            <span
              key={i}
              onClick={() => toggleThread(part)}
              className="cursor-pointer transition-colors duration-300"
              style={{
                color: isThreaded ? "hsla(38, 40%, 65%, 0.9)" : "hsla(38, 25%, 63%, 0.65)",
                borderBottom: `1px dotted hsla(38, 25%, 50%, ${isThreaded ? 0.3 : 0.1})`,
              }}
            >
              {part}
            </span>
          );
        })}
      </p>

      {/* Depth threads below */}
      <AnimatePresence>
        {threads.map((termKey) => {
          const term = TERMS[termKey];
          if (!term) return null;
          return (
            <motion.div
              key={termKey}
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
              style={{ marginTop: 6, marginBottom: 2 }}
            >
              <div className="flex gap-3" style={{ paddingLeft: 8 }}>
                {/* Thread line */}
                <div style={{
                  width: 1,
                  minHeight: 40,
                  background: "linear-gradient(to bottom, hsla(38, 35%, 55%, 0.25), hsla(38, 35%, 55%, 0.05))",
                  flexShrink: 0,
                  marginTop: 4,
                }} />

                <div style={{ padding: "6px 0 10px" }}>
                  {/* Thread label */}
                  <span style={{
                    fontSize: 9,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "hsla(38, 30%, 55%, 0.35)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}>
                    {termKey}
                  </span>

                  <p style={{
                    fontSize: 13,
                    lineHeight: 1.75,
                    color: "hsla(30, 10%, 68%, 0.65)",
                    fontFamily: "'Playfair Display', serif",
                    margin: "6px 0 0",
                  }}>
                    {term.depth}
                  </p>

                  <div className="flex items-center gap-4 mt-2">
                    <span style={{
                      fontSize: 9,
                      color: "hsla(38, 25%, 50%, 0.3)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Trust {(term.trust * 100).toFixed(0)}%
                    </span>
                    <span
                      className="cursor-pointer"
                      style={{
                        fontSize: 10,
                        fontFamily: "'Playfair Display', serif",
                        fontStyle: "italic",
                        color: "hsla(38, 30%, 55%, 0.35)",
                      }}
                    >
                      {term.followUp} →
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Demo Page
// ═══════════════════════════════════════════════════════════════════════

export default function TextDepthDemo() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "hsla(25, 8%, 6%, 1)",
        color: "hsla(30, 10%, 80%, 0.9)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-14 text-center">
          <h1
            style={{
              fontSize: "clamp(22px, 3vw, 32px)",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 400,
              color: "hsla(38, 25%, 70%, 0.7)",
              marginBottom: 8,
            }}
          >
            Depth Exploration Models
          </h1>
          <p style={{
            fontSize: 13,
            color: "hsla(30, 10%, 55%, 0.4)",
            fontStyle: "italic",
            fontFamily: "'Playfair Display', serif",
          }}>
            Tap any highlighted term to explore depth. Compare the three approaches.
          </p>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Model 1 */}
          <div>
            <div className="mb-6">
              <h2 style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                textTransform: "uppercase" as const,
                color: "hsla(38, 30%, 58%, 0.45)",
                marginBottom: 4,
              }}>
                Inline Expansion
              </h2>
              <p style={{
                fontSize: 11,
                color: "hsla(30, 10%, 50%, 0.35)",
                fontStyle: "italic",
                fontFamily: "'Playfair Display', serif",
              }}>
                Text breathes open in place. No departure.
              </p>
            </div>
            <div
              className="rounded-xl"
              style={{
                padding: "24px",
                background: "hsla(25, 8%, 8%, 0.6)",
                border: "1px solid hsla(38, 15%, 30%, 0.08)",
              }}
            >
              <InlineExpansion />
            </div>
          </div>

          {/* Model 2 */}
          <div>
            <div className="mb-6">
              <h2 style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                textTransform: "uppercase" as const,
                color: "hsla(38, 30%, 58%, 0.45)",
                marginBottom: 4,
              }}>
                Contextual Bloom
              </h2>
              <p style={{
                fontSize: 11,
                color: "hsla(30, 10%, 50%, 0.35)",
                fontStyle: "italic",
                fontFamily: "'Playfair Display', serif",
              }}>
                A pocket universe opens near your selection.
              </p>
            </div>
            <div
              className="rounded-xl"
              style={{
                padding: "24px",
                background: "hsla(25, 8%, 8%, 0.6)",
                border: "1px solid hsla(38, 15%, 30%, 0.08)",
                minHeight: 300,
              }}
            >
              <ContextualBloom />
            </div>
          </div>

          {/* Model 3 */}
          <div>
            <div className="mb-6">
              <h2 style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                textTransform: "uppercase" as const,
                color: "hsla(38, 30%, 58%, 0.45)",
                marginBottom: 4,
              }}>
                Depth Thread
              </h2>
              <p style={{
                fontSize: 11,
                color: "hsla(30, 10%, 50%, 0.35)",
                fontStyle: "italic",
                fontFamily: "'Playfair Display', serif",
              }}>
                Thoughts branch downward like roots.
              </p>
            </div>
            <div
              className="rounded-xl"
              style={{
                padding: "24px",
                background: "hsla(25, 8%, 8%, 0.6)",
                border: "1px solid hsla(38, 15%, 30%, 0.08)",
              }}
            >
              <DepthThread />
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-center mt-12" style={{
          fontSize: 11,
          color: "hsla(30, 10%, 45%, 0.25)",
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
        }}>
          This is a temporary comparison page. Select your preferred model and it will be integrated into Lumen.
        </p>
      </div>
    </div>
  );
}
