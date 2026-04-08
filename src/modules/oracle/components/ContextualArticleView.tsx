/**
 * ContextualArticleView — Wraps lens renderers with context-aware personalization
 * and provenance banners.
 *
 * Lens toggles have been removed: each lens produces unique content (and thus
 * a unique UOR address), so lens selection happens at generation time, not here.
 * This view only renders the already-chosen lens output.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { MediaData } from "@/modules/oracle/lib/stream-knowledge";
import AdaptiveContentContainer from "./AdaptiveContentContainer";
import WikiArticleView from "./WikiArticleView";
import MagazineLensRenderer from "./lenses/MagazineLensRenderer";
import SimpleLensRenderer from "./lenses/SimpleLensRenderer";
import DeepDiveLensRenderer from "./lenses/DeepDiveLensRenderer";
import StoryLensRenderer from "./lenses/StoryLensRenderer";
import ComputeLensRenderer from "./lenses/ComputeLensRenderer";
import ProvenanceBanner from "./ProvenanceBanner";

const LENS_RENDERERS: Record<string, React.FC<{
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
  media?: MediaData;
  immersive?: boolean;
}>> = {
  encyclopedia: WikiArticleView,
  magazine: MagazineLensRenderer,
  "explain-like-5": SimpleLensRenderer,
  expert: DeepDiveLensRenderer,
  storyteller: StoryLensRenderer,
  compute: ComputeLensRenderer,
};

interface ContextualArticleViewProps {
  title: string;
  contentMarkdown: string;
  wikidata?: Record<string, unknown> | null;
  sources: string[];
  synthesizing?: boolean;
  contextKeywords?: string[];
  activeLens?: string;
  isReaderMode?: boolean;
  provenance?: {
    model?: string;
    personalized?: boolean;
    personalizedTopics?: string[];
  };
  media?: MediaData;
  immersive?: boolean;
}

const ContextualArticleView: React.FC<ContextualArticleViewProps> = ({
  title,
  contentMarkdown,
  wikidata,
  sources,
  synthesizing = false,
  contextKeywords = [],
  activeLens = "encyclopedia",
  isReaderMode = false,
  provenance,
  media,
  immersive = false,
}) => {
  const navigate = useNavigate();

  const relevantContext = contextKeywords.filter(
    (k) => k.toLowerCase() !== title.toLowerCase()
  ).slice(0, 5);

  return (
    <div>
      {/* ── Provenance Banner ── */}
      {!synthesizing && contentMarkdown.trim().length > 50 && (
        <ProvenanceBanner
          sourceCount={sources.length}
          model={provenance?.model}
          personalized={provenance?.personalized}
          personalizedTopics={provenance?.personalizedTopics}
        />
      )}

      {/* ── Context Banner (hidden in reader mode) ── */}
      {!isReaderMode && relevantContext.length > 0 && !synthesizing && contentMarkdown.trim().length > 100 && (
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

      {/* ── Article — routed through active lens renderer ── */}
      <AdaptiveContentContainer>
        {(() => {
          const rendererKey = LENS_RENDERERS[activeLens]
            ? activeLens
            : "encyclopedia";
          const LensRenderer = LENS_RENDERERS[rendererKey];
          return (
            <LensRenderer
              title={title}
              contentMarkdown={contentMarkdown}
              wikidata={wikidata}
              sources={sources}
              synthesizing={synthesizing}
              media={media}
              immersive={immersive}
            />
          );
        })()}
      </AdaptiveContentContainer>
    </div>
  );
};

export default ContextualArticleView;
