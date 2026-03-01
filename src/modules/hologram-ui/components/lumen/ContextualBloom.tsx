/**
 * ContextualBloom — Depth Exploration Through Interaction
 * ═══════════════════════════════════════════════════════
 *
 * Renders text with invisible depth affordances. No pre-highlighting.
 * Terms reveal their depth through hover (desktop) or long-press (mobile).
 *
 * Three-prong follow-up system:
 *   1. Deepen — increases resolution on the exact mechanism
 *   2. Ground — makes the concept accessible to anyone
 *   3. Imply — reveals what this changes or enables
 *
 * The bloom appears as a radial expansion from the interaction point,
 * like a pocket universe opening near the selected term.
 */

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────

export interface BloomTerm {
  /** The term text as it appears in the response */
  text: string;
  /** Start index in the full text */
  startIndex: number;
}

interface BloomData {
  term: string;
  explanation: string;
  deepen: string;
  ground: string;
  imply: string;
  loading: boolean;
}

interface ActiveBloom {
  term: string;
  x: number;
  y: number;
  data: BloomData | null;
}

interface ContextualBloomProps {
  /** The full response text (plain, not markdown) */
  children: React.ReactNode;
  /** The original thought/query for context */
  thought: string;
  /** Full understanding text for AI context */
  understanding: string;
  /** Callback when a follow-up is triggered */
  onFollowUp: (question: string) => void;
  /** When false, bloom detection/interaction is disabled (default true) */
  enabled?: boolean;
}

// ── Term Detection ───────────────────────────────────────────────────

/**
 * Detects depth-worthy terms from text using three heuristics:
 * 1. Conceptual density — multi-word phrases that compress meaning
 * 2. Technical terms — words with specific domain weight
 * 3. Novel concepts — phrases unlikely to be everyday language
 *
 * Returns lowercase normalized terms for matching.
 */
function detectDepthTerms(text: string): Set<string> {
  const terms = new Set<string>();

  // Extract bold/emphasized markers from markdown (** or *)
  const boldMatches = text.matchAll(/\*\*([^*]+)\*\*/g);
  for (const m of boldMatches) {
    const t = m[1].trim();
    if (t.length > 2 && t.length < 60) terms.add(t.toLowerCase());
  }

  const italicMatches = text.matchAll(/(?<!\*)\*([^*]+)\*(?!\*)/g);
  for (const m of italicMatches) {
    const t = m[1].trim();
    if (t.length > 2 && t.length < 60 && !t.includes("(") && !t.includes("http")) {
      terms.add(t.toLowerCase());
    }
  }

  // Detect capitalized multi-word phrases (e.g., "Topological Confinement")
  const capitalPhrases = text.matchAll(/(?:[A-Z][a-z]+(?:\s+(?:of|the|and|in|for|to|with|by|on|at|as|from|through|via|into|upon)\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
  for (const m of capitalPhrases) {
    const t = m[0].trim();
    if (t.length > 4 && t.length < 50 && !isCommonPhrase(t)) {
      terms.add(t.toLowerCase());
    }
  }

  return terms;
}

/** Filter out common English phrases that aren't conceptually deep */
function isCommonPhrase(phrase: string): boolean {
  const common = new Set([
    "the first", "the second", "the third", "for example", "in fact",
    "on the other hand", "at the same time", "in other words",
    "the united states", "the world", "new york", "the internet",
  ]);
  return common.has(phrase.toLowerCase());
}

// ── Bloom Generation ─────────────────────────────────────────────────

async function generateBloom(
  term: string,
  thought: string,
  understanding: string,
): Promise<BloomData> {
  try {
    const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`;

    const prompt = `You are Lumen, a reasoning companion. The user asked: "${thought}"

In your response, you used the term "${term}". Now generate a depth bloom for this term.

Respond in EXACTLY this JSON format, nothing else:
{
  "explanation": "A 2-3 sentence explanation of this term that captures its essence in relation to the current topic. It must be clear enough for anyone to understand, yet precise enough for an expert to confirm. No jargon without immediate clarification.",
  "deepen": "A single question that drills deeper into the mechanism of this concept, staying precisely on the current topic axis.",
  "ground": "A single question that builds foundational understanding of this concept for anyone, regardless of expertise.",
  "imply": "A single question that reveals what this concept changes, enables, or means for the reader's understanding."
}`;

    const resp = await fetch(STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: prompt },
        ],
        model: "google/gemini-2.5-flash-lite",
        personaId: "hologram",
        skillId: "reason",
      }),
    });

    if (!resp.ok || !resp.body) {
      throw new Error("Failed to generate bloom");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const c = parsed.choices?.[0]?.delta?.content;
          if (c) fullText += c;
        } catch {}
      }
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = fullText.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(jsonText);

    return {
      term,
      explanation: parsed.explanation || "This concept carries depth worth exploring.",
      deepen: parsed.deepen || `How does ${term} work at a deeper level?`,
      ground: parsed.ground || `What does ${term} mean in simple terms?`,
      imply: parsed.imply || `What does ${term} change or make possible?`,
      loading: false,
    };
  } catch (e) {
    console.warn("Bloom generation failed:", e);
    return {
      term,
      explanation: `"${term}" is a concept that carries significant meaning in this context. Tap a question below to explore further.`,
      deepen: `How does ${term} work at a deeper level within this context?`,
      ground: `What does ${term} mean, explained simply?`,
      imply: `What does understanding ${term} change or make possible?`,
      loading: false,
    };
  }
}

// ── Bloom Card ───────────────────────────────────────────────────────

const BloomCard = memo(function BloomCard({
  bloom,
  onClose,
  onFollowUp,
}: {
  bloom: ActiveBloom;
  onClose: () => void;
  onFollowUp: (q: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const data = bloom.data;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", handler), 100);
    return () => { clearTimeout(t); document.removeEventListener("pointerdown", handler); };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const prongs = data && !data.loading ? [
    { label: "Deepen", icon: "↓", question: data.deepen, color: "hsla(38, 40%, 55%, 0.5)" },
    { label: "Ground", icon: "○", question: data.ground, color: "hsla(152, 35%, 55%, 0.45)" },
    { label: "Imply", icon: "→", question: data.imply, color: "hsla(260, 35%, 60%, 0.45)" },
  ] : [];

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="absolute z-50"
      style={{
        left: bloom.x,
        top: bloom.y + 8,
        width: "min(340px, calc(100vw - 48px))",
        transformOrigin: "top center",
      }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "hsla(25, 10%, 9%, 0.95)",
          border: "1px solid hsla(38, 25%, 35%, 0.1)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 80px hsla(0, 0%, 0%, 0.5), 0 0 1px hsla(38, 30%, 50%, 0.08)",
        }}
      >
        <div style={{ padding: "16px 20px" }}>
          {/* Term header */}
          <div className="flex items-center justify-between mb-3">
            <span style={{
              fontSize: 10,
              fontFamily: "'DM Sans', sans-serif",
              color: "hsla(38, 30%, 58%, 0.5)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}>
              {bloom.term}
            </span>
          </div>

          {/* Explanation or loading */}
          {data?.loading ? (
            <div className="flex items-center gap-3 py-4">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "hsla(38, 35%, 55%, 0.6)" }}
              />
              <span style={{
                fontSize: 12,
                color: "hsla(30, 10%, 55%, 0.35)",
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
              }}>
                Opening depth…
              </span>
            </div>
          ) : data ? (
            <>
              <p style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: "hsla(30, 12%, 72%, 0.75)",
                fontFamily: "'Playfair Display', serif",
                margin: 0,
                fontWeight: 350,
                letterSpacing: "0.01em",
              }}>
                {data.explanation}
              </p>

              {/* Three prongs */}
              <div
                className="mt-4 pt-3 space-y-0.5"
                style={{ borderTop: "1px solid hsla(38, 15%, 30%, 0.06)" }}
              >
                {prongs.map((prong, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onFollowUp(prong.question);
                      onClose();
                    }}
                    className="w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all duration-300 hover:bg-[hsla(38,12%,18%,0.15)] group"
                  >
                    <span
                      className="flex-shrink-0 mt-[3px] text-[11px] w-4 text-center"
                      style={{ color: prong.color, fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {prong.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span
                        className="text-[8px] tracking-[0.2em] uppercase block mb-0.5"
                        style={{ color: prong.color, fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {prong.label}
                      </span>
                      <span
                        className="text-[12px] leading-[1.6] block transition-colors duration-200 group-hover:text-[hsla(30,15%,75%,0.7)]"
                        style={{
                          color: "hsla(30, 12%, 62%, 0.5)",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {prong.question}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
});

// ── Bloom-Enabled Text Wrapper ───────────────────────────────────────

/**
 * Wraps React children (from ReactMarkdown) with invisible bloom affordances.
 * On hover (desktop), a faint warm glow appears on depth-worthy terms.
 * On click/long-press, the bloom opens.
 */
export default memo(function ContextualBloom({
  children,
  thought,
  understanding,
  onFollowUp,
  enabled = true,
}: ContextualBloomProps) {
  const [activeBloom, setActiveBloom] = useState<ActiveBloom | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const depthTerms = useRef<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect terms from the raw understanding text
  useEffect(() => {
    if (enabled) depthTerms.current = detectDepthTerms(understanding);
  }, [understanding, enabled]);

  const handleTermInteraction = useCallback(async (
    term: string,
    clientX: number,
    clientY: number,
  ) => {
    if (activeBloom?.term === term) {
      setActiveBloom(null);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Position bloom card centered below click point, clamped to container
    let x = clientX - rect.left - 170; // half card width
    x = Math.max(-8, Math.min(x, rect.width - 340));
    const y = clientY - rect.top;

    // Show loading state immediately
    setActiveBloom({
      term,
      x,
      y,
      data: { term, explanation: "", deepen: "", ground: "", imply: "", loading: true },
    });

    // Generate bloom content
    const data = await generateBloom(term, thought, understanding);
    setActiveBloom(prev => prev?.term === term ? { ...prev, data } : prev);
  }, [activeBloom, thought, understanding]);

  const closeBloom = useCallback(() => setActiveBloom(null), []);

  // Inject hover/click behavior on depth-worthy text nodes
  const handlePointerEvent = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (!target || target.tagName === "BUTTON") return;

    // Check if the element or its text content matches a depth term
    const text = target.textContent?.trim().toLowerCase() || "";
    const matchedTerm = Array.from(depthTerms.current).find(t =>
      text === t || text.includes(t)
    );

    if (matchedTerm && e.type === "pointerup") {
      // Only trigger on short clicks (not text selection)
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;

      handleTermInteraction(matchedTerm, e.clientX, e.clientY);
    }
  }, [handleTermInteraction]);

  // Apply hover glow effect via CSS class
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terms = depthTerms.current;
    if (terms.size === 0) return;

    // Find text nodes matching depth terms and wrap in interactive spans
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodesToWrap: { node: Text; term: string; start: number; end: number }[] = [];

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const nodeText = node.textContent?.toLowerCase() || "";
      for (const term of terms) {
        let searchStart = 0;
        let idx: number;
        while ((idx = nodeText.indexOf(term, searchStart)) !== -1) {
          nodesToWrap.push({ node, term, start: idx, end: idx + term.length });
          searchStart = idx + term.length;
        }
      }
    }

    // Apply data attribute for CSS targeting (non-destructive)
    // Instead of DOM manipulation, use CSS to style matching elements
    const strongEls = container.querySelectorAll("strong, em");
    strongEls.forEach((el) => {
      const elText = el.textContent?.toLowerCase().trim() || "";
      if (terms.has(elText)) {
        (el as HTMLElement).dataset.bloom = "true";
        (el as HTMLElement).style.cursor = "pointer";
      }
    });

    return () => {
      strongEls.forEach((el) => {
        delete (el as HTMLElement).dataset.bloom;
        (el as HTMLElement).style.cursor = "";
      });
    };
  }, [understanding, children]);

  if (!enabled) return <>{children}</>;

  return (
    <div
      ref={containerRef}
      className="relative bloom-container"
      onPointerUp={handlePointerEvent}
    >
      <style>{`
        .bloom-container [data-bloom="true"] {
          transition: text-shadow 0.4s ease, color 0.4s ease;
        }
        .bloom-container [data-bloom="true"]:hover {
          text-shadow: 0 0 20px hsla(38, 50%, 55%, 0.15);
          color: hsla(38, 35%, 75%, 0.9) !important;
        }
        @media (pointer: coarse) {
          .bloom-container [data-bloom="true"] {
            -webkit-tap-highlight-color: hsla(38, 50%, 55%, 0.08);
          }
        }
      `}</style>

      {children}

      <AnimatePresence>
        {activeBloom && (
          <BloomCard
            bloom={activeBloom}
            onClose={closeBloom}
            onFollowUp={onFollowUp}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
