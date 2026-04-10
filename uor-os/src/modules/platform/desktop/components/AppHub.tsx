/**
 * Apps — Unified My Apps + App Store + Developer Hub.
 * ═════════════════════════════════════════════════════════════════
 *
 * Cinema-dark theme matching MediaPlayer & Library.
 * Three pill tabs: My Apps, App Store, Developer.
 */

import { useMemo, useCallback, useState, useEffect } from "react";
import { DESKTOP_APPS, type DesktopApp } from "@/modules/platform/desktop/lib/desktop-apps";
import { getUserFacingCategories, type OsCategoryDescriptor } from "@/modules/platform/desktop/lib/os-taxonomy";
import { CNCF_CATEGORIES } from "@/modules/interoperability/cncf-compat/categories";
import type { CncfCategoryDescriptor } from "@/modules/interoperability/cncf-compat/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, CheckCircle, Clock, AlertCircle, ExternalLink, Star, Sparkles,
  Box, Workflow, Radar, Network, Radio, ArrowLeftRight,
  HardDrive, FileCode, Archive, ShieldCheck, Key, Activity,
  GitBranch, Settings, Globe, Database, Zap, Router, Plug,
  Brain, TrendingUp, ToggleRight, LayoutGrid, Code2, Grid3X3,
} from "lucide-react";
import type { ComponentType } from "react";

// ── Constants ─────────────────────────────────────────────────────────────

type TabId = "my-apps" | "store" | "developer";

const FEATURED_IDS = ["oracle", "messenger", "graph-explorer", "compliance"];
const RECENT_KEY = "uor:recent-apps";
const MAX_RECENT = 8;

const CNCF_ICON_MAP: Record<string, ComponentType<any>> = {
  Box, Workflow, Radar, Network, Radio, ArrowLeftRight,
  HardDrive, FileCode, Archive, ShieldCheck, Key, Activity,
  GitBranch, Settings, Globe, Database, Zap, Router, Plug,
  Brain, TrendingUp, ToggleRight,
};

// ── Recently Used Tracking ────────────────────────────────────────────────

function getRecentIds(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(RECENT_KEY) || "[]").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  const list = getRecentIds().filter((x) => x !== id);
  list.unshift(id);
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

// ── Shared Styles ─────────────────────────────────────────────────────────

const SECTION_HEADER = "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-3";
const PILL_ACTIVE = "bg-white/[0.12] text-white/90 shadow-sm shadow-white/5";
const PILL_INACTIVE = "text-white/35 hover:text-white/55 hover:bg-white/[0.04]";
const CARD_BASE = "rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-200";

// ── App Card — Large (Featured / Recent) ──────────────────────────────────

function LargeAppCard({ app, badge }: { app: DesktopApp; badge?: string }) {
  const Icon = app.icon;
  const launch = useCallback(() => {
    pushRecent(app.id);
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: app.id }));
  }, [app.id]);

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={launch}
      className={`${CARD_BASE} group relative flex flex-col p-5 text-left cursor-default overflow-hidden`}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${app.color}15 0%, transparent 70%)`,
        }}
      />

      {badge && (
        <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.08] text-[9px] font-medium text-white/50 border border-white/[0.06]">
          {badge === "featured" ? <Star className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
          {badge === "featured" ? "Featured" : "Recent"}
        </span>
      )}

      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3.5 shrink-0 ring-1 ring-white/[0.06]"
        style={{ background: `linear-gradient(135deg, ${app.color}25, ${app.color}10)` }}
      >
        <Icon className="w-5.5 h-5.5" style={{ color: app.color }} />
      </div>

      <p className="text-[13px] font-semibold text-white/90 mb-1 relative z-10">{app.label}</p>
      <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2 relative z-10">
        {app.description}
      </p>

      {/* Open overlay */}
      <div className="mt-auto pt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 relative z-10">
        <span className="text-[10px] font-medium text-white/60">Open</span>
        <ExternalLink className="w-2.5 h-2.5 text-white/40" />
      </div>
    </motion.button>
  );
}

// ── App Card — Compact (Grid) ─────────────────────────────────────────────

function CompactAppCard({ app }: { app: DesktopApp }) {
  const Icon = app.icon;
  const launch = useCallback(() => {
    pushRecent(app.id);
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: app.id }));
  }, [app.id]);

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={launch}
      className={`${CARD_BASE} group flex items-center gap-3 p-3 text-left cursor-default`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-white/[0.04]"
        style={{ background: `${app.color}18` }}
      >
        <Icon className="w-4 h-4" style={{ color: app.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-white/85 truncate">{app.label}</p>
        <p className="text-[10px] text-white/30 truncate">{app.description}</p>
      </div>
      <ExternalLink className="w-3 h-3 text-white/0 group-hover:text-white/30 transition-colors shrink-0" />
    </motion.button>
  );
}

// ── Store Card (with "Get" button feel) ───────────────────────────────────

function StoreAppCard({ app }: { app: DesktopApp }) {
  const Icon = app.icon;
  const launch = useCallback(() => {
    pushRecent(app.id);
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: app.id }));
  }, [app.id]);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={launch}
      className={`${CARD_BASE} group flex items-center gap-3.5 p-3.5 text-left cursor-default`}
    >
      <div
        className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0 ring-1 ring-white/[0.06]"
        style={{ background: `linear-gradient(135deg, ${app.color}25, ${app.color}10)` }}
      >
        <Icon className="w-5 h-5" style={{ color: app.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white/90 truncate">{app.label}</p>
        <p className="text-[10px] text-white/30 truncate leading-relaxed">{app.description}</p>
      </div>
      <span className="shrink-0 px-3 py-1 rounded-full bg-white/[0.08] text-[10px] font-semibold text-white/70 group-hover:bg-white/[0.14] transition-colors">
        Open
      </span>
    </motion.button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MY APPS TAB
// ══════════════════════════════════════════════════════════════════════════

function MyAppsTab({ searchQuery }: { searchQuery: string }) {
  const [recentIds, setRecentIds] = useState(getRecentIds);
  const categories = useMemo(() => getUserFacingCategories(), []);
  const q = searchQuery.toLowerCase();

  // Re-read recents when tab becomes active
  useEffect(() => {
    setRecentIds(getRecentIds());
  }, []);

  const recentApps = useMemo(() => {
    return recentIds
      .map((id) => DESKTOP_APPS.find((a) => a.id === id))
      .filter(Boolean) as DesktopApp[];
  }, [recentIds]);

  const filteredRecent = useMemo(() => {
    if (!q) return recentApps;
    return recentApps.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [recentApps, q]);

  const groupedApps = useMemo(() => {
    const groups: { cat: OsCategoryDescriptor; apps: DesktopApp[] }[] = [];
    for (const cat of categories) {
      let apps = DESKTOP_APPS.filter(
        (a) => a.category === cat.id && !a.hidden && a.id !== "app-hub",
      );
      if (q) {
        apps = apps.filter(
          (a) =>
            a.label.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.keywords.some((k) => k.toLowerCase().includes(q)),
        );
      }
      if (apps.length > 0) groups.push({ cat, apps });
    }
    return groups;
  }, [categories, q]);

  return (
    <div className="space-y-6">
      {/* Recently Used */}
      {filteredRecent.length > 0 && (
        <section>
          <h2 className={SECTION_HEADER}>
            <Clock className="w-3 h-3 inline-block mr-1.5 -mt-px" />
            Recently Used
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredRecent.map((app) => (
              <LargeAppCard key={app.id} app={app} badge="recent" />
            ))}
          </div>
        </section>
      )}

      {/* All Apps by Category */}
      {groupedApps.map(({ cat, apps }) => (
        <section key={cat.id}>
          <h2 className={SECTION_HEADER}>{cat.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {apps.map((app) => (
              <CompactAppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      ))}

      {groupedApps.length === 0 && filteredRecent.length === 0 && (
        <EmptyState text="No apps match your search." />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// APP STORE TAB
// ══════════════════════════════════════════════════════════════════════════

function AppStoreTab({ searchQuery }: { searchQuery: string }) {
  const categories = useMemo(() => getUserFacingCategories(), []);
  const [catFilter, setCatFilter] = useState<string>("all");
  const q = searchQuery.toLowerCase();

  const featuredApps = useMemo(
    () =>
      FEATURED_IDS
        .map((id) => DESKTOP_APPS.find((a) => a.id === id))
        .filter(Boolean) as DesktopApp[],
    [],
  );

  const filteredFeatured = useMemo(() => {
    if (!q) return featuredApps;
    return featuredApps.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [featuredApps, q]);

  const storeApps = useMemo(() => {
    let apps = DESKTOP_APPS.filter((a) => !a.hidden && a.id !== "app-hub");
    if (catFilter !== "all") {
      apps = apps.filter((a) => a.category === catFilter);
    }
    if (q) {
      apps = apps.filter(
        (a) =>
          a.label.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.keywords.some((k) => k.toLowerCase().includes(q)),
      );
    }
    return apps;
  }, [catFilter, q]);

  return (
    <div className="space-y-6">
      {/* Featured Hero Row */}
      {filteredFeatured.length > 0 && catFilter === "all" && (
        <section>
          <h2 className={SECTION_HEADER}>
            <Sparkles className="w-3 h-3 inline-block mr-1.5 -mt-px" />
            Featured
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {filteredFeatured.map((app) => (
              <LargeAppCard key={app.id} app={app} badge="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCatFilter("all")}
          className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200 ${
            catFilter === "all" ? PILL_ACTIVE : PILL_INACTIVE
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCatFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200 ${
              catFilter === cat.id ? PILL_ACTIVE : PILL_INACTIVE
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {storeApps.map((app) => (
          <StoreAppCard key={app.id} app={app} />
        ))}
      </div>

      {storeApps.length === 0 && <EmptyState text="No apps found." />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DEVELOPER TAB (preserved from original)
// ══════════════════════════════════════════════════════════════════════════

type DevFilter = "all" | "complete" | "partial" | "planned";

function MaturityBadge({ maturity }: { maturity: CncfCategoryDescriptor["uorMaturity"] }) {
  const config = {
    complete: { label: "Complete", icon: CheckCircle, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    partial: { label: "Partial", icon: Clock, cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    planned: { label: "Planned", icon: AlertCircle, cls: "bg-white/5 text-white/40 border-white/10" },
  }[maturity];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${config.cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

function CncfCard({ cat }: { cat: CncfCategoryDescriptor }) {
  const Icon = CNCF_ICON_MAP[cat.iconKey] ?? Box;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`${CARD_BASE} p-3.5`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
          <Icon className="w-4 h-4 text-white/50" />
        </div>
        <MaturityBadge maturity={cat.uorMaturity} />
      </div>
      <p className="text-[12px] font-semibold text-white/90 mb-0.5">{cat.category}</p>
      <p className="text-[10px] text-white/35 leading-relaxed mb-2.5 line-clamp-2">{cat.description}</p>
      <div className="flex flex-wrap gap-0.5">
        {cat.uorModules.slice(0, 2).map((mod) => (
          <span key={mod} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-white/35 font-mono truncate max-w-[120px]">
            {mod}
          </span>
        ))}
        {cat.uorModules.length > 2 && (
          <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-white/30">
            +{cat.uorModules.length - 2}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function DeveloperTab({ searchQuery }: { searchQuery: string }) {
  const [devFilter, setDevFilter] = useState<DevFilter>("all");

  const filtered = useMemo(() => {
    let cats = CNCF_CATEGORIES;
    if (devFilter !== "all") cats = cats.filter((c) => c.uorMaturity === devFilter);
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
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/70">
          <CheckCircle className="w-3 h-3" /><span>{stats.complete} complete</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
          <Clock className="w-3 h-3" /><span>{stats.partial} partial</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <AlertCircle className="w-3 h-3" /><span>{stats.planned} planned</span>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-1.5">
        {(["all", "complete", "partial", "planned"] as DevFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setDevFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200 capitalize ${
              devFilter === f ? PILL_ACTIVE : PILL_INACTIVE
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map((cat) => (
          <CncfCard key={cat.category} cat={cat} />
        ))}
      </div>
      {filtered.length === 0 && <EmptyState text="No categories match." />}
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16">
      <Search className="w-6 h-6 text-white/15 mx-auto mb-3" />
      <p className="text-[12px] text-white/30">{text}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════

const TABS: { id: TabId; label: string; icon: ComponentType<any> }[] = [
  { id: "my-apps", label: "My Apps", icon: Grid3X3 },
  { id: "store", label: "App Store", icon: LayoutGrid },
  { id: "developer", label: "Developer", icon: Code2 },
];

export default function AppHub() {
  const [tab, setTab] = useState<TabId>("my-apps");
  const [searchQuery, setSearchQuery] = useState("");

  // Track recently opened apps via global event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") pushRecent(detail);
    };
    window.addEventListener("uor:open-app", handler);
    return () => window.removeEventListener("uor:open-app", handler);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[hsl(220_15%_6%)] text-white">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-white/[0.06]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            type="text"
            placeholder="Search apps…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.06] text-[12px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.07] transition-all duration-200"
          />
        </div>

        {/* Tab Pills */}
        <div className="flex gap-1 bg-white/[0.03] rounded-full p-1 w-fit">
          {TABS.map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSearchQuery(""); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 ${
                tab === id ? PILL_ACTIVE : PILL_INACTIVE
              }`}
            >
              <TabIcon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "my-apps" && <MyAppsTab searchQuery={searchQuery} />}
            {tab === "store" && <AppStoreTab searchQuery={searchQuery} />}
            {tab === "developer" && <DeveloperTab searchQuery={searchQuery} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
