/**
 * ContextualArticleView — Wraps WikiArticleView with context-aware personalization.
 *
 * Shows a context banner linking to prior searches and renders the article
 * with connection highlights when the user has exploration history.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import WikiArticleView from "./WikiArticleView";

interface ContextualArticleViewProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
  /** Recent search keywords that formed the context for this article */
  contextKeywords?: string[];
}

const ContextualArticleView: React.FC<ContextualArticleViewProps> = ({
  title,
  contentMarkdown,
  wikidata,
  sources,
  synthesizing = false,
  contextKeywords = [],
}) => {
  const navigate = useNavigate();

  // Filter out current topic from context keywords
  const relevantContext = contextKeywords.filter(
    (k) => k.toLowerCase() !== title.toLowerCase()
  ).slice(0, 5);

  return (
    <div>
      {/* ── Context Banner ── */}
      {relevantContext.length > 0 && !synthesizing && contentMarkdown.trim().length > 100 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-5 px-4 py-3 rounded-lg border border-primary/10 bg-primary/[0.04]"
          style={{ fontSize: 13 }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-foreground/60 text-xs font-semibold uppercase tracking-[0.1em]">
              Personalized for your exploration
            </span>
          </div>
          <p className="text-foreground/50" style={{ lineHeight: 1.6 }}>
            Based on your recent searches:{" "}
            {relevantContext.map((kw, i) => (
              <React.Fragment key={kw}>
                {i > 0 && <span className="text-foreground/20">, </span>}
                <button
                  onClick={() => navigate(`/search?q=${encodeURIComponent(kw)}`)}
                  className="text-primary/70 hover:text-primary transition-colors underline underline-offset-2 decoration-primary/20 hover:decoration-primary/50"
                >
                  {kw}
                </button>
              </React.Fragment>
            ))}
          </p>
        </motion.div>
      )}

      {/* ── Article ── */}
      <WikiArticleView
        title={title}
        contentMarkdown={contentMarkdown}
        wikidata={wikidata}
        sources={sources}
        synthesizing={synthesizing}
      />
    </div>
  );
};

export default ContextualArticleView;
