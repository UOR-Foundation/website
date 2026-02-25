/**
 * /interoperability — Universal Interoperability Map
 *
 * 356+ projections across 12 canonical categories.
 * One hash. Every standard.
 */

import { useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { InteroperabilityMap } from "../components/InteroperabilityMap";
import { KnowledgeGraph } from "../components/KnowledgeGraph";

type ViewMode = "graph" | "list";

export default function InteroperabilityPage() {
  const [view, setView] = useState<ViewMode>("list");

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero — minimal, high-impact */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-[25px] md:pt-52 pb-14 sm:pb-18">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="max-w-2xl">
                <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-mono font-medium mb-4">
                  One Hash · Every Standard
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Universal Interoperability Map
                </h1>
                <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                  Every external standard is a deterministic projection of a single UOR identity.
                  Explore how they compose into cross-protocol synergy chains.
                </p>
              </div>
              {/* View toggle */}
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    view === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Explorer
                </button>
                <button
                  onClick={() => setView("graph")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    view === "graph"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Graph
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {view === "graph" ? <KnowledgeGraph /> : <InteroperabilityMap />}
        </section>
      </div>
    </Layout>
  );
}
