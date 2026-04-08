/**
 * ContextualArticleView — Wraps WikiArticleView with context-aware personalization,
 * adaptive lens intelligence, and transparent lens inspector.
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, Newspaper, Baby, GraduationCap, BookText, User, Plus, Settings2 } from "lucide-react";
import type { MediaData } from "@/modules/oracle/lib/stream-knowledge";
import WikiArticleView from "./WikiArticleView";
import MagazineLensRenderer from "./lenses/MagazineLensRenderer";
import SimpleLensRenderer from "./lenses/SimpleLensRenderer";
import DeepDiveLensRenderer from "./lenses/DeepDiveLensRenderer";
import StoryLensRenderer from "./lenses/StoryLensRenderer";
import ProvenanceBanner from "./ProvenanceBanner";
import LensInspector from "./LensInspector";
import {
  PRESET_BLUEPRINTS,
  loadCustomLenses,
  getBlueprint,
  type LensBlueprint,
  type KnowledgeLens,
} from "@/modules/oracle/lib/knowledge-lenses";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  BookOpen,
  Newspaper,
  Baby,
  GraduationCap,
  BookText,
  Sparkles,
  User,
};

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
  isReaderMode?: boolean;
  provenance?: {
    model?: string;
    personalized?: boolean;
    personalizedTopics?: string[];
  };
  media?: MediaData;
  immersive?: boolean;
  /** AI-suggested lens from coherence engine */
  suggestedBlueprint?: LensBlueprint | null;
  /** Callback when user applies a full blueprint (triggers re-stream with params) */
  onBlueprintApply?: (bp: LensBlueprint) => void;
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
  isReaderMode = false,
  provenance,
  media,
  immersive = false,
  suggestedBlueprint,
  onBlueprintApply,
}) => {
  const navigate = useNavigate();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectedBlueprint, setInspectedBlueprint] = useState<LensBlueprint | null>(null);

  const relevantContext = contextKeywords.filter(
    (k) => k.toLowerCase() !== title.toLowerCase()
  ).slice(0, 5);

  // Combine preset + custom + suggested lenses
  const allLenses = useMemo(() => {
    const custom = loadCustomLenses();
    const lenses: Array<LensBlueprint & { _type: "preset" | "custom" | "suggested" }> = [
      ...PRESET_BLUEPRINTS.map(l => ({ ...l, _type: "preset" as const })),
      ...custom.map(l => ({ ...l, _type: "custom" as const })),
    ];
    // Add suggested if not already present
    if (suggestedBlueprint && !lenses.some(l => l.id === suggestedBlueprint.id)) {
      lenses.push({ ...suggestedBlueprint, _type: "suggested" as const });
    }
    return lenses;
  }, [suggestedBlueprint]);

  const openInspector = (bp: LensBlueprint) => {
    setInspectedBlueprint(bp);
    setInspectorOpen(true);
  };

  const handleBlueprintApply = (bp: LensBlueprint) => {
    if (onBlueprintApply) {
      onBlueprintApply(bp);
    } else if (onLensChange) {
      // Fallback: just switch to the base lens ID
      const baseId = PRESET_BLUEPRINTS.find(p => p.id === bp.id)?.id;
      onLensChange(baseId || bp.id);
    }
  };

  return (
    <div>
      {/* ── Lens Switcher (hidden in reader mode — toolbar provides it) ── */}
      {onLensChange && !isReaderMode && (
        <div className="mb-4 flex items-center gap-1.5 flex-wrap">
          {allLenses.map((lens) => {
            const Icon = ICON_MAP[lens.icon] || BookOpen;
            const isActive = lens.id === activeLens;
            const isSuggested = lens._type === "suggested";
            const isCustom = lens._type === "custom";
            return (
              <motion.button
                key={lens.id}
                layout
                initial={isSuggested ? { opacity: 0, scale: 0.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  if (!isActive) onLensChange(lens.id);
                }}
                onDoubleClick={() => openInspector(lens)}
                disabled={synthesizing && isActive}
                title={`${lens.description}${isSuggested ? " ✦ AI suggested" : ""}${isCustom ? " — custom" : ""}\nDouble-click to inspect`}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-200 border relative
                  ${isActive
                    ? "bg-primary/15 text-primary border-primary/25 shadow-sm"
                    : isSuggested
                      ? "bg-primary/[0.06] text-primary/70 border-primary/15 hover:bg-primary/15 hover:text-primary"
                      : "bg-muted/5 text-muted-foreground/50 border-border/10 hover:bg-muted/15 hover:text-foreground/70 hover:border-border/20"
                  }
                  ${synthesizing && !isActive ? "opacity-40 cursor-wait" : "cursor-pointer"}
                `}
              >
                {isSuggested && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
                )}
                <Icon className="w-3 h-3" />
                <span>{lens.label}</span>
                {isSuggested && <span className="text-[9px] opacity-50">✦</span>}
              </motion.button>
            );
          })}
          {/* Inspect active lens button */}
          <button
            onClick={() => {
              const bp = allLenses.find(l => l.id === activeLens) || getBlueprint(activeLens);
              openInspector(bp);
            }}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] text-muted-foreground/30 hover:text-primary/60 border border-dashed border-border/15 hover:border-primary/25 transition-all"
            title="Inspect & customize active lens"
          >
            <Settings2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Lens Inspector Panel ── */}
      {inspectedBlueprint && (
        <div className="mb-4">
          <LensInspector
            blueprint={inspectedBlueprint}
            open={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
            onApply={handleBlueprintApply}
          />
        </div>
      )}

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
      {(() => {
        // For custom/dynamic lenses, find closest preset renderer
        const rendererKey = LENS_RENDERERS[activeLens]
          ? activeLens
          : "encyclopedia"; // fallback
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
    </div>
  );
};

export default ContextualArticleView;
