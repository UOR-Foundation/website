/**
 * PackageManagerPanel — Visual registry of installed holographic projections
 * + Registry Explorer for npm, crates.io, and PyPI metadata fetching.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useRef } from "react";
import {
  IconX, IconSearch, IconPackage, IconCircleCheck, IconAlertTriangle,
  IconExternalLink, IconPlayerPlay, IconFilter, IconChevronDown,
  IconDownload, IconLoader2, IconTerminal, IconBrandNpm,
} from "@tabler/icons-react";
import { PROJECTIONS, project, type ProjectionInput, type HologramProjection } from "@/modules/uns/core/hologram";
import { KP } from "@/modules/hologram-os/kernel-palette";
import {
  registryApi, REGISTRIES,
  type RegistryId, type RegistrySearchResult, type PackageMeta,
} from "@/lib/api/package-registry";

// ── Tier taxonomy ───────────────────────────────────────────────────────
interface TierDef { label: string; from: number; color: string }

const TIERS: TierDef[] = [
  { label: "Foundational",              from: 0,   color: "hsl(38, 60%, 55%)" },
  { label: "UOR Native",                from: 5,   color: "hsl(30, 45%, 55%)" },
  { label: "Federation & Discovery",    from: 10,  color: "hsl(200, 55%, 55%)" },
  { label: "Enterprise & Industry",     from: 20,  color: "hsl(160, 50%, 50%)" },
  { label: "Infrastructure & Emerging", from: 35,  color: "hsl(270, 45%, 60%)" },
  { label: "Programming Languages",     from: 80,  color: "hsl(210, 60%, 55%)" },
  { label: "Cloud & DevOps",            from: 200, color: "hsl(190, 50%, 50%)" },
  { label: "Data & Analytics",          from: 300, color: "hsl(340, 45%, 55%)" },
];

function tierFor(idx: number): TierDef {
  let tier = TIERS[0];
  for (const t of TIERS) if (idx >= t.from) tier = t;
  return tier;
}

// ── Demo identity for invocation ────────────────────────────────────────
const DEMO_HASH = new Uint8Array(32);
for (let i = 0; i < 32; i++) DEMO_HASH[i] = (i * 37 + 17) & 0xff;
const DEMO_HEX = Array.from(DEMO_HASH).map(b => b.toString(16).padStart(2, "0")).join("");
const DEMO_CID = `bafkreig${DEMO_HEX.slice(0, 50)}`;
const DEMO_INPUT: ProjectionInput = { hashBytes: DEMO_HASH, cid: DEMO_CID, hex: DEMO_HEX };

interface PackageEntry {
  name: string;
  fidelity: "lossless" | "lossy";
  spec: string;
  lossWarning?: string;
  tier: TierDef;
  idx: number;
}

type PanelTab = "installed" | "registry";

// ═════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════

interface PackageManagerPanelProps { onClose: () => void }

export default function PackageManagerPanel({ onClose }: PackageManagerPanelProps) {
  const [tab, setTab] = useState<PanelTab>("installed");

  return (
    <div className="w-full h-full flex flex-col" style={{ background: KP.bg, fontFamily: KP.font }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${KP.border}` }}>
        <IconPackage size={20} strokeWidth={1.4} style={{ color: KP.gold }} />
        <span className="text-[15px] font-semibold tracking-wide" style={{ color: KP.text }}>
          Package Manager
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"
          style={{ color: KP.muted }}
        >
          <IconX size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 px-4 shrink-0" style={{ borderBottom: `1px solid ${KP.border}` }}>
        {([
          { id: "installed" as const, label: "Installed Projections" },
          { id: "registry" as const, label: "Registry Explorer" },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="text-[12px] px-3 py-2.5 transition-colors relative"
            style={{
              color: tab === t.id ? KP.text : KP.dim,
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
            {tab === t.id && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                style={{ background: KP.gold }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {tab === "installed" ? <InstalledTab /> : <RegistryTab />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// INSTALLED TAB (original functionality)
// ═════════════════════════════════════════════════════════════════════════

function InstalledTab() {
  const [search, setSearch] = useState("");
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [invokedResult, setInvokedResult] = useState<{ name: string; result: HologramProjection } | null>(null);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  const packages = useMemo<PackageEntry[]>(() => {
    const entries: PackageEntry[] = [];
    let idx = 0;
    for (const [name, spec] of PROJECTIONS) {
      entries.push({ name, fidelity: spec.fidelity, spec: spec.spec, lossWarning: spec.lossWarning, tier: tierFor(idx), idx });
      idx++;
    }
    return entries;
  }, []);

  const tierList = useMemo(() => {
    const seen = new Map<string, { tier: TierDef; count: number }>();
    for (const p of packages) {
      const e = seen.get(p.tier.label);
      if (e) e.count++; else seen.set(p.tier.label, { tier: p.tier, count: 1 });
    }
    return [...seen.values()];
  }, [packages]);

  const filtered = useMemo(() => {
    let list = packages;
    if (activeTier) list = list.filter(p => p.tier.label === activeTier);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.spec.toLowerCase().includes(q));
    }
    return list;
  }, [packages, search, activeTier]);

  const grouped = useMemo(() => {
    const map = new Map<string, PackageEntry[]>();
    for (const p of filtered) {
      const list = map.get(p.tier.label) ?? [];
      list.push(p);
      map.set(p.tier.label, list);
    }
    return map;
  }, [filtered]);

  const invoke = useCallback((name: string) => {
    try {
      const result = project(DEMO_INPUT, name);
      setInvokedResult({ name, result });
    } catch (err) {
      console.error("Projection invocation failed:", err);
    }
  }, []);

  const lossless = packages.filter(p => p.fidelity === "lossless").length;
  const lossy = packages.length - lossless;

  return (
    <>
      {/* Stats */}
      <div className="flex items-center gap-4 px-5 py-2 shrink-0" style={{ borderBottom: `1px solid ${KP.border}`, background: KP.card }}>
        <div className="flex items-center gap-1.5">
          <IconCircleCheck size={13} style={{ color: KP.green }} />
          <span className="text-[11px]" style={{ color: KP.muted }}>{lossless} lossless</span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconAlertTriangle size={13} style={{ color: KP.gold }} />
          <span className="text-[11px]" style={{ color: KP.muted }}>{lossy} lossy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: KP.green }} />
          <span className="text-[11px]" style={{ color: KP.muted }}>{packages.length} installed</span>
        </div>
      </div>

      {/* Search + tier chips */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: `1px solid ${KP.border}` }}>
        <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}>
          <IconSearch size={14} style={{ color: KP.dim }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projections…"
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:opacity-40"
            style={{ color: KP.text }}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveTier(null)}
            className="text-[10px] px-2 py-1 rounded-full whitespace-nowrap"
            style={{ background: !activeTier ? KP.gold : KP.card, color: !activeTier ? KP.bg : KP.muted, fontWeight: !activeTier ? 600 : 400 }}
          >All</button>
          {tierList.map(({ tier, count }) => (
            <button
              key={tier.label}
              onClick={() => setActiveTier(activeTier === tier.label ? null : tier.label)}
              className="text-[10px] px-2 py-1 rounded-full whitespace-nowrap"
              style={{ background: activeTier === tier.label ? tier.color : KP.card, color: activeTier === tier.label ? KP.bg : KP.muted, fontWeight: activeTier === tier.label ? 600 : 400 }}
            >{tier.label.split(" ")[0]} ({count})</button>
          ))}
        </div>
      </div>

      {/* Invocation toast */}
      {invokedResult && (
        <div className="mx-4 mt-2 rounded-lg px-3 py-2 flex items-start gap-2 shrink-0" style={{ background: "hsla(152, 44%, 50%, 0.1)", border: `1px solid hsla(152, 44%, 50%, 0.25)` }}>
          <IconCircleCheck size={14} className="mt-0.5 shrink-0" style={{ color: KP.green }} />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold" style={{ color: KP.green }}>{invokedResult.name}</span>
            <p className="text-[10px] mt-0.5 break-all" style={{ color: KP.muted }}>{invokedResult.result.value}</p>
          </div>
          <button onClick={() => setInvokedResult(null)} className="shrink-0 mt-0.5"><IconX size={12} style={{ color: KP.dim }} /></button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ scrollbarWidth: "thin" }}>
        {[...grouped.entries()].map(([tierLabel, entries]) => {
          const tier = entries[0].tier;
          return (
            <div key={tierLabel} className="mb-3">
              <div className="flex items-center gap-2 py-1.5 sticky top-0 z-10" style={{ background: KP.bg }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tier.color }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tier.color }}>{tierLabel}</span>
                <span className="text-[10px]" style={{ color: KP.dim }}>({entries.length})</span>
                <div className="flex-1 h-px" style={{ background: KP.border }} />
              </div>
              {entries.map(pkg => {
                const isExp = expandedPkg === pkg.name;
                return (
                  <div key={pkg.name} className="rounded-lg mb-1" style={{ background: isExp ? KP.card : "transparent", border: isExp ? `1px solid ${KP.cardBorder}` : "1px solid transparent" }}>
                    <div className="flex items-center gap-2 px-3 py-2 cursor-pointer group" onClick={() => setExpandedPkg(isExp ? null : pkg.name)}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: KP.green }} />
                      <span className="text-[12px] font-medium flex-1 truncate" style={{ color: KP.text }}>{pkg.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{
                        background: pkg.fidelity === "lossless" ? "hsla(152, 44%, 50%, 0.12)" : "hsla(38, 60%, 55%, 0.12)",
                        color: pkg.fidelity === "lossless" ? KP.green : KP.gold, fontWeight: 600,
                      }}>{pkg.fidelity}</span>
                      <button onClick={e => { e.stopPropagation(); invoke(pkg.name); }} className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "hsla(38, 60%, 55%, 0.15)" }} title={`Invoke ${pkg.name}`}>
                        <IconPlayerPlay size={12} style={{ color: KP.gold }} />
                      </button>
                      <IconChevronDown size={12} className="shrink-0 transition-transform duration-150" style={{ color: KP.dim, transform: isExp ? "rotate(180deg)" : "rotate(0)" }} />
                    </div>
                    {isExp && (
                      <div className="px-3 pb-2.5 pt-0 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: KP.dim }}>Spec</span>
                          <a href={pkg.spec} target="_blank" rel="noopener noreferrer" className="text-[10px] truncate hover:underline flex items-center gap-1" style={{ color: KP.gold }}>
                            {pkg.spec.replace(/^https?:\/\//, "")}<IconExternalLink size={10} />
                          </a>
                        </div>
                        {pkg.lossWarning && (
                          <div className="flex items-start gap-1.5">
                            <IconAlertTriangle size={11} className="mt-0.5 shrink-0" style={{ color: KP.gold }} />
                            <span className="text-[10px]" style={{ color: KP.muted }}>{pkg.lossWarning}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: KP.dim }}>Blueprint</span>
                          <span className="text-[10px] font-mono" style={{ color: KP.muted }}>morphism:Isometry → {pkg.fidelity === "lossless" ? "identity" : "truncation"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: KP.dim }}>Type</span>
                          <span className="text-[10px]" style={{ color: KP.muted }}>Pure function • Stateless • Deterministic</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <IconFilter size={28} strokeWidth={1} style={{ color: KP.dim }} />
            <span className="text-[12px]" style={{ color: KP.dim }}>No projections match your filter</span>
          </div>
        )}
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// REGISTRY EXPLORER TAB
// ═════════════════════════════════════════════════════════════════════════

function RegistryTab() {
  const [registry, setRegistry] = useState<RegistryId>("npm");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegistrySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [meta, setMeta] = useState<PackageMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cmdHistory, setCmdHistory] = useState<{ cmd: string; status: "ok" | "err"; msg: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const regInfo = REGISTRIES[registry];

  const doSearch = useCallback(async (q?: string) => {
    const term = q ?? query;
    if (!term.trim()) return;
    setSearching(true);
    setError(null);
    setSelectedPkg(null);
    setMeta(null);
    try {
      const data = await registryApi.search(registry, term.trim());
      setResults(data);
      if (data.length === 0) setError(`No packages found for "${term}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [registry, query]);

  const fetchMeta = useCallback(async (name: string) => {
    if (selectedPkg === name) { setSelectedPkg(null); setMeta(null); return; }
    setSelectedPkg(name);
    setLoadingMeta(true);
    setMeta(null);
    try {
      const data = await registryApi.meta(registry, name);
      setMeta(data);
    } catch (err) {
      setMeta(null);
    } finally {
      setLoadingMeta(false);
    }
  }, [registry, selectedPkg]);

  const simulateInstall = useCallback((name: string, version: string) => {
    const cmd = `${regInfo.installCmd} ${name}@${version}`;
    setCmdHistory(prev => [...prev, { cmd, status: "ok", msg: `✓ ${name}@${version} → projection registered as hologram lens` }]);
  }, [regInfo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Parse install commands
      const v = query.trim();
      const npmMatch = v.match(/^npm\s+install\s+(.+)/i) || v.match(/^npm\s+i\s+(.+)/i);
      const cargoMatch = v.match(/^cargo\s+install\s+(.+)/i) || v.match(/^cargo\s+add\s+(.+)/i);
      const pipMatch = v.match(/^pip\s+install\s+(.+)/i) || v.match(/^pip3\s+install\s+(.+)/i);

      if (npmMatch) {
        setRegistry("npm");
        const pkg = npmMatch[1].trim().replace(/^@/, "").split("@")[0];
        setQuery(pkg);
        setCmdHistory(prev => [...prev, { cmd: v, status: "ok", msg: `Searching npm for "${pkg}"…` }]);
        doSearch(npmMatch[1].trim().split("@")[0]);
        return;
      }
      if (cargoMatch) {
        setRegistry("cargo");
        const pkg = cargoMatch[1].trim().split("@")[0];
        setQuery(pkg);
        setCmdHistory(prev => [...prev, { cmd: v, status: "ok", msg: `Searching crates.io for "${pkg}"…` }]);
        doSearch(pkg);
        return;
      }
      if (pipMatch) {
        setRegistry("pypi");
        const pkg = pipMatch[1].trim().split("=")[0].split(">")[0].split("<")[0];
        setQuery(pkg);
        setCmdHistory(prev => [...prev, { cmd: v, status: "ok", msg: `Searching PyPI for "${pkg}"…` }]);
        doSearch(pkg);
        return;
      }

      doSearch();
    }
  }, [query, doSearch]);

  return (
    <>
      {/* Registry selector */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: `1px solid ${KP.border}`, background: KP.card }}>
        {(Object.keys(REGISTRIES) as RegistryId[]).map(id => {
          const r = REGISTRIES[id];
          const active = registry === id;
          return (
            <button
              key={id}
              onClick={() => { setRegistry(id); setResults([]); setSelectedPkg(null); setMeta(null); setError(null); }}
              className="text-[11px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1.5"
              style={{
                background: active ? r.color : "transparent",
                color: active ? "hsl(0, 0%, 100%)" : KP.muted,
                fontWeight: active ? 600 : 400,
                border: active ? "none" : `1px solid ${KP.cardBorder}`,
              }}
            >
              <span>{r.icon}</span>
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Command input */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: `1px solid ${KP.border}` }}>
        <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}>
          <IconTerminal size={14} style={{ color: regInfo.color }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${regInfo.installCmd} <package>  or search…`}
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:opacity-40 font-mono"
            style={{ color: KP.text }}
          />
          {searching && <IconLoader2 size={14} className="animate-spin" style={{ color: KP.gold }} />}
        </div>
        <button
          onClick={() => doSearch()}
          disabled={searching || !query.trim()}
          className="text-[11px] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
          style={{ background: regInfo.color, color: "hsl(0, 0%, 100%)", fontWeight: 600 }}
        >
          Search
        </button>
      </div>

      {/* Command history */}
      {cmdHistory.length > 0 && (
        <div className="px-4 py-1.5 shrink-0 max-h-[80px] overflow-y-auto" style={{ borderBottom: `1px solid ${KP.border}`, background: "hsla(0, 0%, 0%, 0.2)" }}>
          {cmdHistory.slice(-5).map((h, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] font-mono" style={{ color: KP.dim }}>$</span>
              <span className="text-[10px] font-mono" style={{ color: KP.muted }}>{h.cmd}</span>
              <span className="text-[10px]" style={{ color: h.status === "ok" ? KP.green : KP.red }}>{h.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 rounded-lg px-3 py-2 shrink-0" style={{ background: "hsla(0, 55%, 55%, 0.1)", border: `1px solid hsla(0, 55%, 55%, 0.2)` }}>
          <span className="text-[11px]" style={{ color: KP.red }}>{error}</span>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {results.length > 0 && (
          <div className="px-4 py-2 space-y-1">
            {results.map(pkg => {
              const isSelected = selectedPkg === pkg.name;
              return (
                <div key={pkg.name} className="rounded-lg" style={{ background: isSelected ? KP.card : "transparent", border: isSelected ? `1px solid ${KP.cardBorder}` : "1px solid transparent" }}>
                  {/* Row */}
                  <div className="flex items-center gap-2 px-3 py-2 cursor-pointer group" onClick={() => fetchMeta(pkg.name)}>
                    <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: KP.text }}>{pkg.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: KP.card, color: KP.muted }}>{pkg.version}</span>
                    {pkg.license && pkg.license !== "unknown" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "hsla(200, 55%, 55%, 0.12)", color: "hsl(200, 55%, 55%)" }}>{pkg.license}</span>
                    )}
                    {pkg.downloads !== undefined && pkg.downloads > 0 && (
                      <span className="text-[9px]" style={{ color: KP.dim }}>{formatDownloads(pkg.downloads)} dl</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); simulateInstall(pkg.name, pkg.version); }}
                      className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: `${regInfo.color}22` }}
                      title={`${regInfo.installCmd} ${pkg.name}`}
                    >
                      <IconDownload size={12} style={{ color: regInfo.color }} />
                    </button>
                    <IconChevronDown size={12} className="shrink-0 transition-transform duration-150" style={{ color: KP.dim, transform: isSelected ? "rotate(180deg)" : "rotate(0)" }} />
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <p className="px-3 pb-1.5 text-[10px] truncate" style={{ color: KP.muted }}>{pkg.description}</p>
                  )}

                  {/* Expanded metadata */}
                  {isSelected && (
                    <div className="px-3 pb-3 pt-1 space-y-2">
                      {loadingMeta ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                          <IconLoader2 size={16} className="animate-spin" style={{ color: KP.gold }} />
                          <span className="text-[11px]" style={{ color: KP.muted }}>Fetching metadata…</span>
                        </div>
                      ) : meta ? (
                        <MetadataView registry={registry} meta={meta} regInfo={regInfo} onInstall={() => simulateInstall(meta.name, meta.version)} />
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {results.length === 0 && !searching && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
            <span className="text-[28px]">{regInfo.icon}</span>
            <span className="text-[13px] font-medium" style={{ color: KP.text }}>Search {regInfo.label}</span>
            <span className="text-[11px] text-center leading-relaxed" style={{ color: KP.dim }}>
              Type a package name or use install commands:<br />
              <code className="font-mono text-[10px]" style={{ color: KP.gold }}>npm install react</code>{" · "}
              <code className="font-mono text-[10px]" style={{ color: KP.gold }}>cargo install serde</code>{" · "}
              <code className="font-mono text-[10px]" style={{ color: KP.gold }}>pip install requests</code>
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Metadata detail view ────────────────────────────────────────────────

function MetadataView({ registry, meta, regInfo, onInstall }: {
  registry: RegistryId;
  meta: PackageMeta;
  regInfo: typeof REGISTRIES[RegistryId];
  onInstall: () => void;
}) {
  const rows: { label: string; value: string | React.ReactNode }[] = [];

  // Common fields
  rows.push({ label: "Version", value: meta.version });
  if (meta.license && meta.license !== "unknown") rows.push({ label: "License", value: meta.license });
  if (meta.description) rows.push({ label: "Description", value: meta.description });

  // Registry-specific fields
  if (registry === "npm") {
    const n = meta as any;
    if (n.versions) rows.push({ label: "Published Versions", value: String(n.versions) });
    if (n.unpackedSize) rows.push({ label: "Unpacked Size", value: formatBytes(n.unpackedSize) });
    if (n.dependencies?.length) rows.push({ label: "Dependencies", value: n.dependencies.slice(0, 10).join(", ") + (n.dependencies.length > 10 ? ` +${n.dependencies.length - 10} more` : "") });
    if (n.maintainers?.length) rows.push({ label: "Maintainers", value: n.maintainers.slice(0, 5).join(", ") });
    if (n.distShasum) rows.push({ label: "SHA Sum", value: <span className="font-mono text-[9px] break-all">{n.distShasum}</span> });
    if (n.distIntegrity) rows.push({ label: "Integrity", value: <span className="font-mono text-[9px] break-all">{n.distIntegrity}</span> });
  } else if (registry === "cargo") {
    const c = meta as any;
    if (c.downloads) rows.push({ label: "Total Downloads", value: formatDownloads(c.downloads) });
    if (c.recentDownloads) rows.push({ label: "Recent Downloads", value: formatDownloads(c.recentDownloads) });
    if (c.msrv) rows.push({ label: "Min Rust Version", value: c.msrv });
    if (c.categories?.length) rows.push({ label: "Categories", value: c.categories.join(", ") });
    if (c.dependencies?.length) rows.push({ label: "Dependencies", value: c.dependencies.slice(0, 10).join(", ") });
    if (c.versions) rows.push({ label: "Published Versions", value: String(c.versions) });
  } else if (registry === "pypi") {
    const p = meta as any;
    if (p.author) rows.push({ label: "Author", value: p.author });
    if (p.requiresPython) rows.push({ label: "Requires Python", value: p.requiresPython });
    if (p.dependencies?.length) rows.push({ label: "Dependencies", value: p.dependencies.slice(0, 8).join(", ") + (p.dependencies.length > 8 ? ` +${p.dependencies.length - 8} more` : "") });
    if (p.versions) rows.push({ label: "Published Versions", value: String(p.versions) });
    if (p.classifiers?.length) rows.push({ label: "Classifiers", value: p.classifiers.slice(0, 3).join(" · ") });
  }

  // Links
  if (meta.homepage) rows.push({ label: "Homepage", value: <a href={meta.homepage} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1" style={{ color: KP.gold }}>{meta.homepage.replace(/^https?:\/\//, "").slice(0, 40)}<IconExternalLink size={10} /></a> });
  if (meta.repository) rows.push({ label: "Repository", value: <a href={meta.repository.replace(/^git\+/, "").replace(/\.git$/, "")} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1" style={{ color: KP.gold }}>{meta.repository.replace(/^https?:\/\//, "").replace(/^git\+/, "").slice(0, 40)}<IconExternalLink size={10} /></a> });

  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider shrink-0 w-[90px] text-right pt-0.5" style={{ color: KP.dim }}>{r.label}</span>
          <span className="text-[10px] flex-1 min-w-0" style={{ color: KP.muted }}>{r.value}</span>
        </div>
      ))}

      {/* Install command + button */}
      <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: `1px solid ${KP.border}` }}>
        <div className="flex-1 rounded px-2 py-1.5 font-mono text-[10px]" style={{ background: "hsla(0, 0%, 0%, 0.3)", color: KP.muted }}>
          $ {regInfo.installCmd} {meta.name}@{meta.version}
        </div>
        <button
          onClick={onInstall}
          className="text-[10px] px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
          style={{ background: regInfo.color, color: "hsl(0, 0%, 100%)", fontWeight: 600 }}
        >
          <IconDownload size={12} />
          Install
        </button>
      </div>
    </div>
  );
}

// ── Utils ────────────────────────────────────────────────────────────────

function formatDownloads(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatBytes(b: number): string {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}
