/**
 * App Store — Unified Discover, Build & Run Hub.
 * ═════════════════════════════════════════════════════════════════
 *
 * Consolidates the desktop App Hub (launchable apps) with the
 * CNCF infrastructure category showcase into a single window.
 *
 * Two tabs:
 *   Discover — Browse and launch UOR-native applications
 *   Developer — CNCF landscape categories mapped to UOR modules
 */

import { useMemo, useCallback, useState } from "react";
import { DESKTOP_APPS, type DesktopApp } from "@/modules/desktop/lib/desktop-apps";
import { getUserFacingCategories } from "@/modules/desktop/lib/os-taxonomy";
import { CNCF_CATEGORIES } from "@/modules/cncf-compat/categories";
import type { CncfCategoryDescriptor } from "@/modules/cncf-compat/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, CheckCircle, Clock, AlertCircle,
  Box, Workflow, Radar, Network, Radio, ArrowLeftRight,
  HardDrive, FileCode, Archive, ShieldCheck, Key, Activity,
  GitBranch, Settings, Globe, Database, Zap, Router, Plug,
  Brain, TrendingUp, ToggleRight, LayoutGrid, Code2,
} from "lucide-react";
import type { ComponentType } from "react";

// ── Featured app IDs ──────────────────────────────────────────────────────
const FEATURED_IDS = ["oracle", "messenger", "graph-explorer"];

// ── Icon Maps ─────────────────────────────────────────────────────────────
const CNCF_ICON_MAP: Record<string, ComponentType<any>> = {
  Box, Workflow, Radar, Network, Radio, ArrowLeftRight,
  HardDrive, FileCode, Archive, ShieldCheck, Key, Activity,
  GitBranch, Settings, Globe, Database, Zap, Router, Plug,
  Brain, TrendingUp, ToggleRight,
};

// ── Tabs ──────────────────────────────────────────────────────────────────
type TabId = "discover" | "developer";

// ── App Card (Discover Tab) ──────────────────────────────────────────────

function AppCard({ app, featured }: { app: DesktopApp; featured?: boolean }) {
  const Icon = app.icon;

  const launch = useCallback(() => {
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: app.id }));
  }, [app.id]);

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={launch}
      className={`group flex ${featured ? "flex-row gap-4 p-4" : "flex-col items-center gap-2.5 p-4"} rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left cursor-default`}
    >
      <div
        className={`${featured ? "w-11 h-11" : "w-10 h-10"} rounded-xl flex items-center justify-center shrink-0`}
        style={{ background: `${app.color.replace(")", " / 0.15)")}` }}
      >
        <Icon
          className={`${featured ? "w-5 h-5" : "w-4.5 h-4.5"}`}
          style={{ color: app.color }}
        />
      </div>
      <div className={`${featured ? "" : "text-center"} min-w-0`}>
        <p className="text-[13px] font-semibold text-foreground/90 truncate">{app.label}</p>
        <p className={`text-[11px] text-muted-foreground/50 ${featured ? "" : "line-clamp-2"} leading-relaxed mt-0.5`}>
          {app.description}
        </p>
      </div>
    </motion.button>
  );
}

// ── Maturity Badge (Developer Tab) ────────────────────────────────────────

function MaturityBadge({ maturity }: { maturity: CncfCategoryDescriptor["uorMaturity"] }) {
  const config = {
    complete: { label: "Complete", icon: CheckCircle, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    partial: { label: "Partial", icon: Clock, cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    planned: { label: "Planned", icon: AlertCircle, cls: "bg-white/5 text-muted-foreground/60 border-white/10" },
  }[maturity];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${config.cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

// ── CNCF Category Card (Developer Tab) ────────────────────────────────────

function CncfCard({ cat }: { cat: CncfCategoryDescriptor }) {
  const Icon = CNCF_ICON_MAP[cat.iconKey] ?? Box;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] p-3.5 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground/70" />
        </div>
        <MaturityBadge maturity={cat.uorMaturity} />
      </div>

      <p className="text-[12px] font-semibold text-foreground/90 mb-0.5">{cat.category}</p>
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed mb-2.5 line-clamp-2">
        {cat.description}
      </p>

      {/* UOR Modules */}
      <div className="flex flex-wrap gap-0.5">
        {cat.uorModules.slice(0, 2).map((mod) => (
          <span key={mod} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-muted-foreground/50 font-mono truncate max-w-[120px]">
            {mod}
          </span>
        ))}
        {cat.uorModules.length > 2 && (
          <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-muted-foreground/40">
            +{cat.uorModules.length - 2}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Discover Tab Content ──────────────────────────────────────────────────

function DiscoverTab({ searchQuery }: { searchQuery: string }) {
  const categories = useMemo(() => getUserFacingCategories(), []);

  const featuredApps = useMemo(
    () => FEATURED_IDS.map((id) => DESKTOP_APPS.find((a) => a.id === id)).filter(Boolean) as DesktopApp[],
    [],
  );

  const groupedApps = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const groups: { label: string; apps: DesktopApp[] }[] = [];

    for (const cat of categories) {
      let apps = DESKTOP_APPS.filter(
        (a) => a.category === cat.id && !a.hidden && !FEATURED_IDS.includes(a.id) && a.id !== "app-hub",
      );
      if (q) {
        apps = apps.filter(
          (a) =>
            a.label.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.keywords.some((k) => k.toLowerCase().includes(q)),
        );
      }
      if (apps.length > 0) {
        groups.push({ label: cat.label, apps });
      }
    }
    return groups;
  }, [categories, searchQuery]);

  const filteredFeatured = useMemo(() => {
    if (!searchQuery) return featuredApps;
    const q = searchQuery.toLowerCase();
    return featuredApps.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [featuredApps, searchQuery]);

  return (
    <>
      {/* Featured */}
      {filteredFeatured.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-3">
            Featured
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {filteredFeatured.map((app) => (
              <AppCard key={app.id} app={app} featured />
            ))}
          </div>
        </section>
      )}

      {/* Category groups */}
      {groupedApps.map(({ label, apps }) => (
        <section key={label}>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-3">
            {label}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      ))}

      {groupedApps.length === 0 && filteredFeatured.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[12px] text-muted-foreground/40">No apps match your search.</p>
        </div>
      )}
    </>
  );
}

// ── Developer Tab Content ─────────────────────────────────────────────────

type DevFilter = "all" | "complete" | "partial" | "planned";

function DeveloperTab({ searchQuery }: { searchQuery: string }) {
  const [devFilter, setDevFilter] = useState<DevFilter>("all");

  const filtered = useMemo(() => {
    let cats = CNCF_CATEGORIES;

    if (devFilter !== "all") {
      cats = cats.filter((c) => c.uorMaturity === devFilter);
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
  }, [devFilter, searchQuery]);

  const stats = useMemo(() => ({
    complete: CNCF_CATEGORIES.filter((c) => c.uorMaturity === "complete").length,
    partial: CNCF_CATEGORIES.filter((c) => c.uorMaturity === "partial").length,
    planned: CNCF_CATEGORIES.filter((c) => c.uorMaturity === "planned").length,
  }), []);

  return (
    <>
      {/* Stats Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/70">
          <CheckCircle className="w-3 h-3" />
          <span>{stats.complete} complete</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
          <Clock className="w-3 h-3" />
          <span>{stats.partial} partial</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
          <AlertCircle className="w-3 h-3" />
          <span>{stats.planned} planned</span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 mb-4">
        {(["all", "complete", "partial", "planned"] as DevFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setDevFilter(f)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors capitalize ${
              devFilter === f
                ? "bg-white/10 text-foreground/90"
                : "bg-white/[0.03] text-muted-foreground/40 hover:bg-white/[0.06]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map((cat) => (
          <CncfCard key={cat.category} cat={cat} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[12px] text-muted-foreground/40">No categories match your search.</p>
        </div>
      )}
    </>
  );
}

// ── Main App Store Component ──────────────────────────────────────────────

export default function AppHub() {
  const [tab, setTab] = useState<TabId>("discover");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 mb-3">
          {/* Tabs */}
          <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
            <button
              onClick={() => setTab("discover")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                tab === "discover"
                  ? "bg-white/[0.1] text-foreground/90"
                  : "text-muted-foreground/50 hover:text-muted-foreground/70"
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              Discover
            </button>
            <button
              onClick={() => setTab("developer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                tab === "developer"
                  ? "bg-white/[0.1] text-foreground/90"
                  : "text-muted-foreground/50 hover:text-muted-foreground/70"
              }`}
            >
              <Code2 className="w-3 h-3" />
              Developer
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30" />
            <input
              type="text"
              placeholder={tab === "discover" ? "Search apps…" : "Search categories…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none focus:border-white/[0.12] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <AnimatePresence mode="wait">
          {tab === "discover" ? (
            <motion.div
              key="discover"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <DiscoverTab searchQuery={searchQuery} />
            </motion.div>
          ) : (
            <motion.div
              key="developer"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-0"
            >
              <DeveloperTab searchQuery={searchQuery} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
