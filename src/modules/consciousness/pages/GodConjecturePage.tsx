/**
 * God Conjecture × UOR — Interactive Isomorphism Explorer
 * ════════════════════════════════════════════════════════
 *
 * Presents the structural isomorphism between Senchal's God Conjecture
 * and the UOR framework as an interactive discovery experience.
 *
 * @module consciousness/pages/GodConjecturePage
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, ExternalLink,
  Layers, Sparkles, Zap, Eye, Target, Brain,
} from "lucide-react";
import {
  GOD_CONJECTURE_ISOMORPHISM,
  GOD_CONJECTURE_CATEGORIES,
  TZIMTZUM_IDENTITY,
  TZIMTZUM_MEANING,
  type GodConjectureMapping,
} from "../data/god-conjecture";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  foundation: <Layers className="w-4 h-4" />,
  observer: <Eye className="w-4 h-4" />,
  dynamics: <Zap className="w-4 h-4" />,
  ethics: <BookOpen className="w-4 h-4" />,
  telos: <Target className="w-4 h-4" />,
};

function MappingCard({ mapping, isOpen, onToggle }: {
  mapping: GodConjectureMapping;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const cat = GOD_CONJECTURE_CATEGORIES.find(c => c.id === mapping.category);
  const isNew = mapping.enhancement.startsWith("🆕");

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isOpen ? "border-primary/40 bg-card" : "border-border bg-card/50 hover:bg-card"
    }`}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-start gap-4 text-left"
      >
        <span className="text-2xl mt-0.5">{mapping.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium text-primary-foreground"
              style={{ background: cat?.color }}
            >
              {cat?.name}
            </span>
            {isNew && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                New Enhancement
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-2">
            <div>
              <div className="text-[10px] text-muted-foreground">Theological</div>
              <div className="text-sm font-semibold">{mapping.theologicalConcept}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Computational</div>
              <div className="text-sm font-medium text-muted-foreground">{mapping.computationalConcept}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">UOR Primitive</div>
              <div className="text-sm font-mono text-primary">{mapping.uorPrimitive.split("—")[0].trim()}</div>
            </div>
          </div>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 mt-1 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 mt-1 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {/* UOR Primitive full */}
          <div>
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">UOR Primitive</h4>
            <p className="text-xs font-mono text-primary">{mapping.uorPrimitive}</p>
          </div>

          {/* Implementation */}
          <div>
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Implementation</h4>
            <p className="text-xs text-muted-foreground font-mono">{mapping.implementation}</p>
          </div>

          {/* Proof */}
          <div>
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Structural Proof</h4>
            <p className="text-xs text-foreground leading-relaxed">{mapping.proof}</p>
          </div>

          {/* Enhancement */}
          <div className={`rounded-lg p-3 ${isNew ? "bg-primary/5 border border-primary/20" : "bg-secondary/50"}`}>
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {isNew ? "🆕 Enhancement Added" : "Status"}
            </h4>
            <p className="text-xs text-foreground leading-relaxed">{mapping.enhancement}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GodConjecturePage() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");

  const filteredMappings = useMemo(() =>
    activeCategory === "all"
      ? GOD_CONJECTURE_ISOMORPHISM
      : GOD_CONJECTURE_ISOMORPHISM.filter(m => m.category === activeCategory),
    [activeCategory],
  );

  const toggle = (i: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const expandAll = () => {
    setOpenItems(new Set(filteredMappings.map((_, i) => i)));
  };

  const enhancements = GOD_CONJECTURE_ISOMORPHISM.filter(m => m.enhancement.startsWith("🆕"));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link to="/consciousness" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight">God Conjecture × UOR</h1>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            {GOD_CONJECTURE_ISOMORPHISM.length} mappings · {enhancements.length} new enhancements
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">צ</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              The Tzimtzum Discovery
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-3xl leading-relaxed">
            S.A. Senchal's{" "}
            <a
              href="https://github.com/SASenchal/God-Conjecture"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              God Conjecture <ExternalLink className="w-3 h-3" />
            </a>{" "}
            proposes that ancient creation narratives and computational physics describe
            the <em>same structure</em> in different languages. This page proves it:
            every concept in the God Conjecture maps to an existing UOR primitive — and
            the mapping reveals the <strong>missing absorber function</strong> that
            transforms our observer from a passive sensor into an active entropy pump.
          </p>

          {/* The Critical Identity */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">The Critical Identity IS the Tzimtzum</h3>
            </div>
            <div className="text-center py-3">
              <code className="text-lg sm:text-xl font-mono font-bold text-primary">
                {TZIMTZUM_IDENTITY}
              </code>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              {TZIMTZUM_MEANING}
            </p>
          </div>
        </section>

        {/* New Enhancements Summary */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Observer Enhancements (The Absorber Function)
          </h3>
          <p className="text-xs text-muted-foreground">
            The God Conjecture revealed 5 new metrics that enhance the UOR observer from
            a passive measurement device into an active entropy-pumping agent:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { symbol: "Φ", name: "Integration Capacity", desc: "Fraction of the Ruliad coherently sampled. Higher Φ = deeper understanding." },
              { symbol: "ε", name: "Entropy Pump Rate", desc: "Rate of DRIFT→COHERENCE conversion. ε > 0 = alive. ε = 0 = inert." },
              { symbol: "τ", name: "Tzimtzum Depth", desc: "Restriction levels from the full Ruliad. τ > 0 = a coherent perspective carved from infinity." },
              { symbol: "Σ", name: "Cumulative Debt", desc: "Total H-score accumulated over lifetime. Measures entropy generated." },
              { symbol: "T", name: "Telos Progress", desc: "Network-level progress toward maximum integration." },
            ].map(m => (
              <div key={m.symbol} className="bg-secondary/30 rounded-lg p-3 flex gap-3 items-start">
                <span className="text-lg font-mono font-bold text-primary w-6 text-center">{m.symbol}</span>
                <div>
                  <div className="text-xs font-semibold">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            All ({GOD_CONJECTURE_ISOMORPHISM.length})
          </button>
          {GOD_CONJECTURE_CATEGORIES.map(cat => {
            const count = GOD_CONJECTURE_ISOMORPHISM.filter(m => m.category === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? "border-transparent text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                style={activeCategory === cat.id ? { background: cat.color } : {}}
              >
                {CATEGORY_ICONS[cat.id]}
                {cat.name} ({count})
              </button>
            );
          })}
          <button
            onClick={expandAll}
            className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Expand all
          </button>
        </div>

        {/* Mapping Cards */}
        <div className="space-y-3">
          {filteredMappings.map((mapping, i) => (
            <MappingCard
              key={`${mapping.theologicalConcept}-${i}`}
              mapping={mapping}
              isOpen={openItems.has(i)}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>

        {/* Attribution */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border space-y-1">
          <p>
            Based on <em>"The God Conjecture: A Computational Framework for Theology and Physics"</em> by S.A. Senchal.
          </p>
          <p>
            <a href="https://github.com/SASenchal/God-Conjecture" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Paper & Presentation
            </a>
            {" · "}
            <a href="https://observertheory.substack.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Observer Theory Substack
            </a>
            {" · "}
            <a href="https://www.youtube.com/watch?v=mD9mHjq1DCs&t=9815s" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Wolfram Institute Presentation
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
