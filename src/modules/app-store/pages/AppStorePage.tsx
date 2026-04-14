/**
 * App Store Page — Developer-Facing CNCF Category Showcase.
 * ═════════════════════════════════════════════════════════════════
 *
 * Displays all CNCF landscape categories with their UOR-native
 * equivalents, maturity status, and constituent projects.
 *
 * Includes a Developer section that maps every CNCF category
 * to the UOR modules that implement it.
 */

import { useMemo, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { CNCF_CATEGORIES } from "@/modules/cncf-compat/categories";
import type { CncfCategoryDescriptor } from "@/modules/cncf-compat/types";
import {
  Box, Workflow, Radar, Network, Radio, ArrowLeftRight,
  HardDrive, FileCode, Archive, ShieldCheck, Key, Activity,
  GitBranch, Settings, Globe, Database, Zap, Router, Plug,
  Brain, TrendingUp, ToggleRight, Search, CheckCircle, Clock,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import type { ComponentType } from "react";

// ── Icon Resolver ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, ComponentType<any>> = {
  Box, Workflow, Radar, Network, Radio, ArrowLeftRight,
  HardDrive, FileCode, Archive, ShieldCheck, Key, Activity,
  GitBranch, Settings, Globe, Database, Zap, Router, Plug,
  Brain, TrendingUp, ToggleRight,
};

// ── Maturity Badge ────────────────────────────────────────────────────────

function MaturityBadge({ maturity }: { maturity: CncfCategoryDescriptor["uorMaturity"] }) {
  const config = {
    complete: { label: "Complete", icon: CheckCircle, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    partial: { label: "Partial", icon: Clock, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    planned: { label: "Planned", icon: AlertCircle, className: "bg-muted/30 text-muted-foreground border-muted-foreground/20" },
  }[maturity];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ── Category Card ─────────────────────────────────────────────────────────

function CategoryCard({ cat }: { cat: CncfCategoryDescriptor }) {
  const Icon = ICON_MAP[cat.iconKey] ?? Box;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
      className="group rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <MaturityBadge maturity={cat.uorMaturity} />
      </div>

      <h3 className="text-[15px] font-semibold text-foreground mb-1">
        {cat.category}
      </h3>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
        {cat.description}
      </p>

      {/* UOR Modules */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
          UOR Modules
        </p>
        <div className="flex flex-wrap gap-1">
          {cat.uorModules.map((mod) => (
            <span
              key={mod}
              className="px-2 py-0.5 rounded bg-primary/5 text-[11px] text-primary/80 font-mono"
            >
              {mod}
            </span>
          ))}
        </div>
      </div>

      {/* CNCF Projects */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
          CNCF Equivalents
        </p>
        <div className="flex flex-wrap gap-1">
          {cat.cncfProjects.slice(0, 4).map((proj) => (
            <span
              key={proj}
              className="px-2 py-0.5 rounded bg-muted/40 text-[11px] text-muted-foreground"
            >
              {proj}
            </span>
          ))}
          {cat.cncfProjects.length > 4 && (
            <span className="px-2 py-0.5 rounded bg-muted/40 text-[11px] text-muted-foreground">
              +{cat.cncfProjects.length - 4} more
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Filter Tabs ───────────────────────────────────────────────────────────

type FilterValue = "all" | "complete" | "partial" | "planned";

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All Categories", value: "all" },
  { label: "Complete", value: "complete" },
  { label: "Partial", value: "partial" },
  { label: "Planned", value: "planned" },
];

// ── Page ──────────────────────────────────────────────────────────────────

export default function AppStorePage() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let cats = CNCF_CATEGORIES;

    if (filter !== "all") {
      cats = cats.filter((c) => c.uorMaturity === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cats = cats.filter(
        (c) =>
          c.category.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.cncfProjects.some((p) => p.toLowerCase().includes(q)) ||
          c.uorModules.some((m) => m.toLowerCase().includes(q)),
      );
    }

    return cats;
  }, [filter, searchQuery]);

  const stats = useMemo(() => ({
    total: CNCF_CATEGORIES.length,
    complete: CNCF_CATEGORIES.filter((c) => c.uorMaturity === "complete").length,
    partial: CNCF_CATEGORIES.filter((c) => c.uorMaturity === "partial").length,
    planned: CNCF_CATEGORIES.filter((c) => c.uorMaturity === "planned").length,
  }), []);

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Infrastructure
          </p>
          <h1 className="font-display text-fluid-page-title font-bold text-foreground">
            App Store
          </h1>
          <p className="mt-10 text-fluid-body text-foreground/70 font-body leading-relaxed max-w-4xl">
            Every CNCF landscape category — implemented natively with content-addressed
            isolation, algebraic verification, and unified knowledge graph integration.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 max-w-2xl">
            {[
              { label: "Categories", value: stats.total, color: "text-foreground" },
              { label: "Complete", value: stats.complete, color: "text-emerald-400" },
              { label: "Partial", value: stats.partial, color: "text-amber-400" },
              { label: "Planned", value: stats.planned, color: "text-muted-foreground" },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-xl bg-card/40 border border-border/30">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-section-sm bg-background">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">
                Developer Categories
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                CNCF landscape categories mapped to UOR-native modules
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search categories, projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((cat) => (
              <CategoryCard key={cat.category} cat={cat} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No categories match your search.</p>
            </div>
          )}
        </section>

        {/* Interoperability Section */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="rounded-2xl border border-border/40 bg-card/40 p-8 md:p-12">
            <h2 className="text-xl font-display font-bold text-foreground mb-3">
              Universal Interoperability
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
              Every application in this catalog is instantiated within a unified knowledge graph,
              powered by the UOR Framework. Content-addressing ensures that any object —
              container image, secret, pipeline, or trace — has a single, verifiable identity
              across all environments: local, cloud, hybrid, or agentic AI.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: "Content-Addressed", desc: "Every artifact has a unique SHA-256 identity. Same hash = same object, anywhere." },
                { title: "Algebraic Isolation", desc: "AppKernel enforces permissions via set intersection — no OS-level hacks needed." },
                { title: "Knowledge Graph Native", desc: "All objects live in the graph. Query, compose, and reason across the entire stack." },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-xl bg-background/50 border border-border/30">
                  <p className="text-[14px] font-semibold text-foreground mb-1">{item.title}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
    </Layout>
  );
}
