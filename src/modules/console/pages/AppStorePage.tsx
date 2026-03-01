/**
 * AppStorePage — Triadic (Learn / Work / Play) App Store
 * ═══════════════════════════════════════════════════════
 *
 * A premium app-store experience with three sections
 * (Learn, Work, Play) and subcategory filtering.
 */

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, GraduationCap, Calculator, Languages, Microscope,
  Code2, Beaker, Target, MessageSquare, BarChart3,
  Music, Film, Gamepad2, Users, Heart,
  Terminal, Timer, Search, Notebook, GitBranch, Columns3,
  Radio, Headphones, Palette, Atom, ShieldCheck, Network,
  Briefcase, Sparkles, Download, Check, Star, ChevronRight,
  TrendingUp, Zap, Crown,
} from "lucide-react";
import {
  appCatalog, subcategories, phaseConfig,
  type StoreApp, type TriadicPhase, type SubcategoryDef,
} from "@/data/app-store";

/* ── Icon resolver ────────────────────────────────────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, GraduationCap, Calculator, Languages, Microscope,
  Code2, Beaker, Target, MessageSquare, BarChart3,
  Music, Film, Gamepad2, Users, Heart,
  Terminal, Timer, Search, Notebook, GitBranch, Columns3,
  Radio, Headphones, Palette, Atom, ShieldCheck, Network,
  Briefcase, Sparkles,
};
function getIcon(key: string) {
  return ICON_MAP[key] || Sparkles;
}

/* ── Phase accent colors (HSL-based for theming) ──────────── */
const PHASE_STYLES: Record<TriadicPhase, {
  bg: string;
  bgSoft: string;
  text: string;
  border: string;
  badge: string;
  glow: string;
}> = {
  learn: {
    bg: "hsla(210, 60%, 50%, 0.12)",
    bgSoft: "hsla(210, 60%, 50%, 0.06)",
    text: "hsl(210, 60%, 60%)",
    border: "hsla(210, 60%, 50%, 0.2)",
    badge: "hsla(210, 60%, 50%, 0.15)",
    glow: "hsla(210, 60%, 50%, 0.08)",
  },
  work: {
    bg: "hsla(38, 55%, 50%, 0.12)",
    bgSoft: "hsla(38, 55%, 50%, 0.06)",
    text: "hsl(38, 55%, 60%)",
    border: "hsla(38, 55%, 50%, 0.2)",
    badge: "hsla(38, 55%, 50%, 0.15)",
    glow: "hsla(38, 55%, 50%, 0.08)",
  },
  play: {
    bg: "hsla(280, 50%, 50%, 0.12)",
    bgSoft: "hsla(280, 50%, 50%, 0.06)",
    text: "hsl(280, 50%, 65%)",
    border: "hsla(280, 50%, 50%, 0.2)",
    badge: "hsla(280, 50%, 50%, 0.15)",
    glow: "hsla(280, 50%, 50%, 0.08)",
  },
};

/* ── Badge component ──────────────────────────────────────── */
function AppBadge({ badge, phase }: { badge?: string; phase: TriadicPhase }) {
  if (!badge) return null;
  const s = PHASE_STYLES[phase];
  const config: Record<string, { icon: React.ElementType; label: string }> = {
    hologram: { icon: Crown, label: "Hologram" },
    new: { icon: Zap, label: "New" },
    popular: { icon: TrendingUp, label: "Popular" },
  };
  const c = config[badge];
  if (!c) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: s.badge, color: s.text }}
    >
      <c.icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

/* ── Star rating ──────────────────────────────────────────── */
function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="w-3 h-3 fill-current" style={{ color: "hsl(45, 80%, 55%)" }} />
      {rating.toFixed(1)}
    </span>
  );
}

/* ── App card ─────────────────────────────────────────────── */
function AppCard({ app, onInstall, onClick }: { app: StoreApp; onInstall: (id: string) => void, onClick: () => void }) {
  const s = PHASE_STYLES[app.phase];
  const Icon = getIcon(app.iconKey);

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${s.bgSoft}, transparent)`,
        borderColor: s.border,
      }}
    >
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: s.bg }}
        >
          <Icon className="w-6 h-6" style={{ color: s.text }} />
        </div>
        <AppBadge badge={app.badge} phase={app.phase} />
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground truncate">{app.name}</h4>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{app.description}</p>
      </div>

      {/* Bottom row: rating + users + action */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-3">
          <StarRating rating={app.rating} />
          {app.users && (
            <span className="text-[11px] text-muted-foreground">{app.users} users</span>
          )}
        </div>
        {app.installed ? (
          <span
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: s.bg, color: s.text }}
          >
            <Check className="w-3 h-3" />
            Open
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onInstall(app.id); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer"
            style={{ background: s.text, color: "hsl(25, 8%, 6%)" }}
          >
            <Download className="w-3 h-3" />
            Get
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Featured hero card ───────────────────────────────────── */
function FeaturedCard({ app, onInstall, onClick }: { app: StoreApp; onInstall: (id: string) => void, onClick: () => void }) {
  const s = PHASE_STYLES[app.phase];
  const phase = phaseConfig[app.phase];
  const Icon = getIcon(app.iconKey);

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.01] hover:shadow-xl cursor-pointer"
      style={{ borderColor: s.border }}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: phase.gradient }}
      />
      <div className="relative p-8 flex items-center gap-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: s.bg, boxShadow: `0 8px 32px ${s.glow}` }}
        >
          <Icon className="w-10 h-10" style={{ color: s.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: s.badge, color: s.text }}
            >
              Featured — {phase.label}
            </span>
          </div>
          <h3 className="text-xl font-bold text-foreground">{app.name}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">{app.description}</p>
          <div className="flex items-center gap-4 mt-3">
            <StarRating rating={app.rating} />
            {app.users && <span className="text-xs text-muted-foreground">{app.users} users</span>}
            {app.installed ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: s.bg, color: s.text }}>
                <Check className="w-3 h-3" /> Installed
              </span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onInstall(app.id); }}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: s.text, color: "hsl(25, 8%, 6%)" }}
              >
                <Download className="w-3 h-3" /> Get
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Subcategory pill ─────────────────────────────────────── */
function SubcategoryPill({ sub, active, phase, onClick }: {
  sub: SubcategoryDef;
  active: boolean;
  phase: TriadicPhase;
  onClick: () => void;
}) {
  const s = PHASE_STYLES[phase];
  const Icon = getIcon(sub.iconKey);
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer"
      style={{
        background: active ? s.bg : "transparent",
        color: active ? s.text : "hsl(var(--muted-foreground))",
        border: `1px solid ${active ? s.border : "hsla(var(--border) / 0.5)"}`,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {sub.label}
    </button>
  );
}

/* ── Phase section ────────────────────────────────────────── */
function PhaseSection({ phase, apps, onInstall, onAppClick }: {
  phase: TriadicPhase;
  apps: StoreApp[];
  onInstall: (id: string) => void;
  onAppClick: (app: StoreApp) => void;
}) {
  const config = phaseConfig[phase];
  const s = PHASE_STYLES[phase];
  const phaseSubs = subcategories.filter(sc => sc.phase === phase);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const PhaseIcon = getIcon(config.iconKey);

  const filtered = activeSub
    ? apps.filter(a => a.subcategory === activeSub)
    : apps;

  const installed = filtered.filter(a => a.installed);
  const available = filtered.filter(a => !a.installed);

  return (
    <section className="space-y-6">
      {/* Phase header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: s.bg }}
        >
          <PhaseIcon className="w-5 h-5" style={{ color: s.text }} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{config.label}</h2>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Subcategory pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSub(null)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer"
          style={{
            background: !activeSub ? s.bg : "transparent",
            color: !activeSub ? s.text : "hsl(var(--muted-foreground))",
            border: `1px solid ${!activeSub ? s.border : "hsla(var(--border) / 0.5)"}`,
          }}
        >
          All
        </button>
        {phaseSubs.map(sub => (
          <SubcategoryPill
            key={sub.slug}
            sub={sub}
            active={activeSub === sub.slug}
            phase={phase}
            onClick={() => setActiveSub(activeSub === sub.slug ? null : sub.slug)}
          />
        ))}
      </div>

      {/* Installed */}
      {installed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Installed
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {installed.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {installed.map(app => (
              <AppCard key={app.id} app={app} onInstall={onInstall} onClick={() => onAppClick(app)} />
            ))}
          </div>
        </div>
      )}

      {/* Available */}
      {available.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Available
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {available.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {available.map(app => (
              <AppCard key={app.id} app={app} onInstall={onInstall} onClick={() => onAppClick(app)} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No apps in this category yet.</p>
      )}
    </section>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function AppStorePage() {
  const navigate = useNavigate();
  const [installedIds, setInstalledIds] = useState<Set<string>>(() =>
    new Set(appCatalog.filter(a => a.installed).map(a => a.id))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activePhaseTab, setActivePhaseTab] = useState<TriadicPhase | "all">("all");

  const handleInstall = useCallback((id: string) => {
    setInstalledIds(prev => new Set(prev).add(id));
  }, []);

  const handleAppClick = useCallback((app: StoreApp) => {
    if (app.route) {
      navigate(app.route);
    }
  }, [navigate]);

  const apps = useMemo(() =>
    appCatalog.map(a => ({
      ...a,
      installed: installedIds.has(a.id),
    })).filter(a => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }
      return true;
    }),
  [installedIds, searchQuery]);

  const featured = useMemo(() => apps.filter(a => a.featured), [apps]);
  const phases: TriadicPhase[] = ["learn", "work", "play"];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">App Store</h1>
          <p className="text-base text-muted-foreground mt-1">
            Discover and install projections across Learn, Work, and Play
          </p>
        </div>

        {/* Search + phase tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search apps…"
              className="w-full rounded-xl border border-border/60 bg-muted/20 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border/40 p-1 bg-muted/10">
            {(["all", ...phases] as const).map(tab => {
              const active = tab === activePhaseTab;
              const tabStyle = tab !== "all" ? PHASE_STYLES[tab] : null;
              return (
                <button
                  key={tab}
                  onClick={() => setActivePhaseTab(tab)}
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize cursor-pointer"
                  style={{
                    background: active ? (tabStyle?.bg || "hsla(var(--foreground) / 0.08)") : "transparent",
                    color: active ? (tabStyle?.text || "hsl(var(--foreground))") : "hsl(var(--muted-foreground))",
                  }}
                >
                  {tab === "all" ? "All" : phaseConfig[tab].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Featured carousel ───────────────────────────────── */}
      {!searchQuery && activePhaseTab === "all" && featured.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Featured Projections
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {featured.slice(0, 3).map(app => (
              <FeaturedCard key={app.id} app={app} onInstall={handleInstall} onClick={() => handleAppClick(app)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Phase sections ──────────────────────────────────── */}
      {phases
        .filter(p => activePhaseTab === "all" || activePhaseTab === p)
        .map(phase => {
          const phaseApps = apps.filter(a => a.phase === phase);
          if (phaseApps.length === 0) return null;
          return (
            <PhaseSection
              key={phase}
              phase={phase}
              apps={phaseApps}
              onInstall={handleInstall}
              onAppClick={handleAppClick}
            />
          );
        })
      }

      {/* ── Empty state ─────────────────────────────────────── */}
      {apps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <Search className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">No apps match your search</p>
        </div>
      )}
    </div>
  );
}
