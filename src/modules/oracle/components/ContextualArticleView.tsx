/**
 * ContextualArticleView — Wraps WikiArticleView with context-aware personalization
 * and a lens switcher for changing rendering perspectives.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, Newspaper, Baby, GraduationCap, BookText } from "lucide-react";
import WikiArticleView from "./WikiArticleView";
import MagazineLensRenderer from "./lenses/MagazineLensRenderer";
import SimpleLensRenderer from "./lenses/SimpleLensRenderer";
import DeepDiveLensRenderer from "./lenses/DeepDiveLensRenderer";
import StoryLensRenderer from "./lenses/StoryLensRenderer";
import { KNOWLEDGE_LENSES, type KnowledgeLens } from "@/modules/oracle/lib/knowledge-lenses";

const ICON_MAP: Record<KnowledgeLens["icon"], React.FC<{ className?: string }>> = {
  BookOpen,
  Newspaper,
  Baby,
  GraduationCap,
  BookText,
};

interface ContextualArticleViewProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
  contextKeywords?: string[];
  activeLens?: string;
  onLensChange?: (lensId: string) => void;
}

const ContextualArticleView: React.FC<ContextualArticleViewProps> = ({
  title,
  contentMarkdown,
  wikidata,
  sources,
  synthesizing = false,
  contextKeywords = [],
  activeLens = "encyclopedia",
  onLensChange,
}) => {
  const navigate = useNavigate();

  const relevantContext = contextKeywords.filter(
    (k) => k.toLowerCase() !== title.toLowerCase()
  ).slice(0, 5);

  return (
    <div>
      {/* ── Lens Switcher ── */}
      {onLensChange && (
        <div className="mb-4 flex items-center gap-1.5 flex-wrap">
          {KNOWLEDGE_LENSES.map((lens) => {
            const Icon = ICON_MAP[lens.icon];
            const isActive = lens.id === activeLens;
            return (
              <button
                key={lens.id}
                onClick={() => !isActive && onLensChange(lens.id)}
                disabled={synthesizing && isActive}
                title={lens.description}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-200 border
                  ${isActive
                    ? "bg-primary/15 text-primary border-primary/25 shadow-sm"
                    : "bg-muted/5 text-muted-foreground/50 border-border/10 hover:bg-muted/15 hover:text-foreground/70 hover:border-border/20"
                  }
                  ${synthesizing && !isActive ? "opacity-40 cursor-wait" : "cursor-pointer"}
                `}
              >
                <Icon className="w-3 h-3" />
                <span>{lens.label}</span>
              </button>
            );
          })}
        </div>
      )}

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
