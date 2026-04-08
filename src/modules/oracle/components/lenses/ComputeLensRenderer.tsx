/**
 * ComputeLensRenderer — Wolfram Alpha-style computational knowledge pods.
 *
 * Renders structured pods with plaintext results and Wolfram-generated images.
 * Each pod is a different computational "facet" of the query — properties,
 * comparisons, formulas, plots — mapping directly to UOR hologram projections.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ChevronDown, ChevronRight, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { queryWolfram, isComputableQuery, type WolframPod, type WolframResult } from "@/modules/oracle/lib/wolfram-client";
import { normalizeSource } from "../../lib/citation-parser";
import SourcesPills from "../SourcesPills";
import type { MediaData } from "../../lib/stream-knowledge";

interface LensRendererProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
  media?: MediaData;
  immersive?: boolean;
}

/** Single pod card */
function PodCard({ pod, index }: { pod: WolframPod; index: number }) {
  const [expanded, setExpanded] = useState(index < 6);
  const isPrimary = pod.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`
        border rounded-xl overflow-hidden transition-all duration-200
        ${isPrimary
          ? "border-primary/30 bg-primary/[0.04] shadow-sm"
          : "border-border/40 bg-card/60 hover:border-border/60"
        }
      `}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
        }
        <h3 className={`text-sm font-semibold flex-1 ${isPrimary ? "text-primary" : "text-foreground/80"}`}>
          {pod.title}
        </h3>
        {isPrimary && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/15 text-primary/70 font-medium uppercase tracking-wider">
            Result
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {pod.subpods.map((sp, si) => (
                <div key={si} className="space-y-2">
                  {sp.title && (
                    <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                      {sp.title}
                    </p>
                  )}

                  {/* Wolfram-rendered image */}
                  {sp.img && (
                    <div className="rounded-lg overflow-hidden bg-white p-2 inline-block">
                      <img
                        src={sp.img.src}
                        alt={sp.img.alt}
                        className="max-w-full h-auto"
                        style={{
                          maxHeight: 300,
                          imageRendering: "auto",
                        }}
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Plaintext result */}
                  {sp.plaintext && (
                    <pre
                      className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap font-mono bg-muted/30 rounded-lg px-3 py-2"
                      style={{ fontFamily: "'DM Sans', ui-monospace, monospace", fontSize: 13 }}
                    >
                      {sp.plaintext}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ComputeLensRenderer({
  title,
  contentMarkdown,
  wikidata,
  sources,
  synthesizing,
  media,
}: LensRendererProps) {
  const [result, setResult] = useState<WolframResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-query Wolfram when the lens mounts
  useEffect(() => {
    if (!title) return;

    const ac = new AbortController();

    setLoading(true);

    queryWolfram(title, ac.signal).then((res) => {
      if (!ac.signal.aborted) {
        setResult(res);
        setLoading(false);
      }
    });

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const isComputable = isComputableQuery(title);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-5 h-5 text-primary/60" />
          <span className="text-xs font-semibold text-primary/50 uppercase tracking-[0.12em]">
            Computational Knowledge
          </span>
        </div>
        <h1
          className="text-2xl font-bold text-foreground/90 leading-tight"
          style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}
        >
          {title}
        </h1>
        {result?.inputInterpretation && result.inputInterpretation !== title && (
          <p className="mt-1 text-sm text-muted-foreground/60 italic">
            Interpreted as: {result.inputInterpretation}
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 py-8 justify-center"
        >
          <Loader2 className="w-5 h-5 text-primary/60 animate-spin" />
          <span className="text-sm text-muted-foreground/60">
            Computing with Wolfram Alpha…
          </span>
        </motion.div>
      )}

      {/* Error / no results */}
      {result && !result.success && !loading && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.05]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500/70 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-foreground/70">
                {result.error || "No computational results available for this query."}
              </p>
              {result.didYouMean && result.didYouMean.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground/60">
                  Did you mean:{" "}
                  {result.didYouMean.map((s, i) => (
                    <span key={i}>
                      {i > 0 && ", "}
                      <span className="text-primary/70 font-medium">{s}</span>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wolfram Pods */}
      {result?.success && result.pods.length > 0 && (
        <div className="space-y-3 mb-8">
          {result.pods.map((pod, i) => (
            <PodCard key={pod.id || i} pod={pod} index={i} />
          ))}
        </div>
      )}

      {/* AI narrative content below pods */}
      {contentMarkdown && contentMarkdown.trim().length > 20 && (
        <div className="mt-8 pt-6 border-t border-border/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary/40" />
            <span className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">
              AI Summary
            </span>
          </div>
          <div
            className="prose prose-sm max-w-none text-foreground/75"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              lineHeight: 1.8,
              fontSize: 15,
            }}
          >
            <p style={{ whiteSpace: "pre-wrap" }}>{contentMarkdown.slice(0, 2000)}</p>
          </div>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="mt-6">
          <SourcesPills sources={sources.map(s => normalizeSource(s))} />
        </div>
      )}

      {/* Attribution */}
      <div className="mt-8 pt-4 border-t border-border/10 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground/30">
          Computational results powered by Wolfram|Alpha
        </span>
      </div>
    </div>
  );
}
