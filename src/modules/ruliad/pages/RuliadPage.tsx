/**
 * Ruliad Correspondence — Interactive Visual Page
 * ════════════════════════════════════════════════
 *
 * Shows the structural isomorphism between Wolfram's Ruliad
 * and the UOR framework with expandable concept cards,
 * category filtering, and a synthesis panel.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink, Zap } from "lucide-react";
import {
  RULIAD_CORRESPONDENCE,
  CATEGORIES,
  synthesize,
  type RuliadCategory,
  type RuliadConcept,
} from "../correspondence";

// ── Concept Card ──────────────────────────────────────────────────────────

function ConceptCard({
  concept,
  expanded,
  onToggle,
  categoryColor,
}: {
  concept: RuliadConcept;
  expanded: boolean;
  onToggle: () => void;
  categoryColor: string;
}) {
  return (
    <div
      className={`group border rounded-xl transition-all duration-200 overflow-hidden ${
        expanded
          ? "border-primary/40 bg-card shadow-lg col-span-1 md:col-span-2 lg:col-span-3"
          : "border-border bg-card/60 hover:bg-card hover:border-border/80"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className="text-2xl mt-0.5 shrink-0">{concept.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground text-sm sm:text-base">
              {concept.name}
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${categoryColor}20`,
                color: categoryColor,
              }}
            >
              {concept.category}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {concept.definition}
          </p>
        </div>
        <div className="shrink-0 mt-1 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Wolfram → UOR arrow */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
            {/* Ruliad side */}
            <div className="bg-secondary/40 rounded-lg p-3 border border-border/50">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Ruliad Concept
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {concept.definition}
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center px-2">
              <div className="flex flex-col items-center gap-1">
                <span className="text-primary text-lg">≅</span>
                <span className="text-[9px] text-muted-foreground font-mono">isomorphic</span>
              </div>
            </div>
            <div className="flex md:hidden items-center justify-center py-1">
              <span className="text-primary">↓ ≅ ↓</span>
            </div>

            {/* UOR side */}
            <div
              className="rounded-lg p-3 border"
              style={{
                backgroundColor: `${categoryColor}08`,
                borderColor: `${categoryColor}30`,
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                UOR Implementation
              </div>
              <p className="text-sm font-semibold" style={{ color: categoryColor }}>
                {concept.uorMapping}
              </p>
            </div>
          </div>

          {/* Implementation */}
          <div className="bg-background/60 rounded-lg p-3 border border-border/30">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              📁 Implementation
            </div>
            <p className="text-xs text-foreground/80 font-mono leading-relaxed break-all">
              {concept.implementation}
            </p>
          </div>

          {/* Structural Proof */}
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
              ✦ Structural Proof
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {concept.proof}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Synthesis Banner ──────────────────────────────────────────────────────

function SynthesisBanner() {
  const synthesis = useMemo(() => synthesize(), []);

  return (
    <div className="bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-primary/20 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <Zap className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h2 className="text-lg font-bold text-foreground">
            The Structural Isomorphism
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {synthesis.totalConcepts} Ruliad concepts → {synthesis.totalConcepts} UOR implementations · {synthesis.coveragePercent}% coverage
          </p>
        </div>
      </div>

      <blockquote className="border-l-2 border-primary/40 pl-4 mb-4">
        <p className="text-sm text-foreground/90 leading-relaxed italic">
          {synthesis.thesis}
        </p>
      </blockquote>

      <div className="bg-background/50 rounded-lg p-3 border border-border/30">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
          ✦ Key Insight
        </div>
        <p className="text-sm text-foreground/85 leading-relaxed">
          {synthesis.keyInsight}
        </p>
      </div>

      {/* Category stat pills */}
      <div className="flex flex-wrap gap-2 mt-4">
        {CATEGORIES.map(cat => (
          <span
            key={cat.name}
            className="text-[10px] px-2.5 py-1 rounded-full font-medium border"
            style={{
              backgroundColor: `${cat.color}10`,
              borderColor: `${cat.color}30`,
              color: cat.color,
            }}
          >
            {cat.icon} {cat.label}: {synthesis.categoryCounts[cat.name] || 0}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function RuliadPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState<RuliadCategory | null>(null);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of CATEGORIES) map[cat.name] = cat.color;
    return map;
  }, []);

  const filtered = useMemo(
    () => filterCat
      ? RULIAD_CORRESPONDENCE.filter(c => c.category === filterCat)
      : RULIAD_CORRESPONDENCE,
    [filterCat]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            to="/console"
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Ruliad ≅ UOR Correspondence
            </h1>
            <p className="text-sm text-muted-foreground">
              Every Wolfram concept maps to a UOR primitive — structural isomorphism, not analogy
            </p>
          </div>
          <a
            href="https://writings.stephenwolfram.com/2021/11/the-concept-of-the-ruliad/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Wolfram's Essay <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Synthesis */}
        <SynthesisBanner />

        {/* Motion Simulator CTA */}
        <Link
          to="/ruliad/motion"
          className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
        >
          <span className="text-2xl">🌀</span>
          <div className="flex-1">
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">Rulial Motion Simulator</h3>
            <p className="text-xs text-muted-foreground">Navigate Q0–Q7 via ProjectionHomomorphism & InclusionHomomorphism with live animations</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat(null)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
              !filterCat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({RULIAD_CORRESPONDENCE.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = RULIAD_CORRESPONDENCE.filter(c => c.category === cat.name).length;
            return (
              <button
                key={cat.name}
                onClick={() => setFilterCat(filterCat === cat.name ? null : cat.name as RuliadCategory)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
                  filterCat === cat.name
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={
                  filterCat === cat.name
                    ? { backgroundColor: cat.color }
                    : { backgroundColor: `${cat.color}15` }
                }
              >
                {cat.icon} {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Concept Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((concept, i) => (
            <ConceptCard
              key={concept.name}
              concept={concept}
              expanded={expandedId === i}
              onToggle={() => setExpandedId(expandedId === i ? null : i)}
              categoryColor={colorMap[concept.category] || "hsl(220, 15%, 50%)"}
            />
          ))}
        </div>

        {/* Attribution */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          Ruliad concept definitions from{" "}
          <a
            href="https://mathworld.wolfram.com/Ruliad.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            MathWorld
          </a>{" "}
          and{" "}
          <a
            href="https://writings.stephenwolfram.com/2021/11/the-concept-of-the-ruliad/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Stephen Wolfram's writings
          </a>
          . UOR mappings are structural implementations, not analogies.
        </div>
      </main>
    </div>
  );
}
