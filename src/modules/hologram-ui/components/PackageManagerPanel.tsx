/**
 * PackageManagerPanel — Visual registry of installed holographic projections.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Shows every registered projection spec with:
 *   - Name, spec URL, fidelity badge
 *   - Tier grouping (Foundational → Federation → Enterprise → Infrastructure → …)
 *   - One-click invocation (projects the current identity through the selected spec)
 *   - Search / filter
 *
 * Performance: lazily reads from the SPECS Map — zero copies at mount.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import {
  IconX, IconSearch, IconPackage, IconCircleCheck, IconAlertTriangle,
  IconExternalLink, IconPlayerPlay, IconFilter, IconChevronDown,
} from "@tabler/icons-react";
import { PROJECTIONS, project, type ProjectionInput, type HologramProjection } from "@/modules/uns/core/hologram";
import { KP } from "@/modules/hologram-os/kernel-palette";

// ── Tier taxonomy (derived from specs.ts structure) ──────────────────────
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

// ── Minimal demo identity for one-click invocation ──────────────────────
const DEMO_HASH = new Uint8Array(32);
for (let i = 0; i < 32; i++) DEMO_HASH[i] = (i * 37 + 17) & 0xff;
const DEMO_HEX = Array.from(DEMO_HASH).map(b => b.toString(16).padStart(2, "0")).join("");
const DEMO_CID = `bafkreig${DEMO_HEX.slice(0, 50)}`;
const DEMO_INPUT: ProjectionInput = { hashBytes: DEMO_HASH, cid: DEMO_CID, hex: DEMO_HEX };

// ── Types ───────────────────────────────────────────────────────────────
interface PackageEntry {
  name: string;
  fidelity: "lossless" | "lossy";
  spec: string;
  lossWarning?: string;
  tier: TierDef;
  idx: number;
}

// ── Component ───────────────────────────────────────────────────────────

interface PackageManagerPanelProps {
  onClose: () => void;
}

export default function PackageManagerPanel({ onClose }: PackageManagerPanelProps) {
  const [search, setSearch] = useState("");
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [invokedResult, setInvokedResult] = useState<{ name: string; result: HologramProjection } | null>(null);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Build flat list once — SPECS is immutable after module load
  const packages = useMemo<PackageEntry[]>(() => {
    const entries: PackageEntry[] = [];
    let idx = 0;
    for (const [name, spec] of PROJECTIONS) {
      entries.push({
        name,
        fidelity: spec.fidelity,
        spec: spec.spec,
        lossWarning: spec.lossWarning,
        tier: tierFor(idx),
        idx,
      });
      idx++;
    }
    return entries;
  }, []);

  // Derive visible tiers
  const tierList = useMemo(() => {
    const seen = new Map<string, { tier: TierDef; count: number }>();
    for (const p of packages) {
      const existing = seen.get(p.tier.label);
      if (existing) existing.count++;
      else seen.set(p.tier.label, { tier: p.tier, count: 1 });
    }
    return [...seen.values()];
  }, [packages]);

  // Filter
  const filtered = useMemo(() => {
    let list = packages;
    if (activeTier) list = list.filter(p => p.tier.label === activeTier);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.spec.toLowerCase().includes(q));
    }
    return list;
  }, [packages, search, activeTier]);

  // Group by tier
  const grouped = useMemo(() => {
    const map = new Map<string, PackageEntry[]>();
    for (const p of filtered) {
      const list = map.get(p.tier.label) ?? [];
      list.push(p);
      map.set(p.tier.label, list);
    }
    return map;
  }, [filtered]);

  // Invoke projection
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
    <div className="w-full h-full flex flex-col" style={{ background: KP.bg, fontFamily: KP.font }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${KP.border}` }}
      >
        <IconPackage size={20} strokeWidth={1.4} style={{ color: KP.gold }} />
        <span className="text-[15px] font-semibold tracking-wide flex-1" style={{ color: KP.text }}>
          Package Manager
        </span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: KP.card, color: KP.muted }}>
          {packages.length} projections
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
          style={{ color: KP.muted }}
        >
          <IconX size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-5 py-2 shrink-0"
        style={{ borderBottom: `1px solid ${KP.border}`, background: KP.card }}
      >
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
          <span className="text-[11px]" style={{ color: KP.muted }}>All installed</span>
        </div>
      </div>

      {/* ── Search + filter ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: `1px solid ${KP.border}` }}>
        <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}>
          <IconSearch size={14} style={{ color: KP.dim }} />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projections…"
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:opacity-40"
            style={{ color: KP.text }}
          />
        </div>
        {/* Tier filter chips */}
        <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveTier(null)}
            className="text-[10px] px-2 py-1 rounded-full whitespace-nowrap transition-colors"
            style={{
              background: !activeTier ? KP.gold : KP.card,
              color: !activeTier ? KP.bg : KP.muted,
              fontWeight: !activeTier ? 600 : 400,
            }}
          >
            All
          </button>
          {tierList.map(({ tier, count }) => (
            <button
              key={tier.label}
              onClick={() => setActiveTier(activeTier === tier.label ? null : tier.label)}
              className="text-[10px] px-2 py-1 rounded-full whitespace-nowrap transition-colors"
              style={{
                background: activeTier === tier.label ? tier.color : KP.card,
                color: activeTier === tier.label ? KP.bg : KP.muted,
                fontWeight: activeTier === tier.label ? 600 : 400,
              }}
            >
              {tier.label.split(" ")[0]} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* ── Invocation result toast ─────────────────────────────────── */}
      {invokedResult && (
        <div
          className="mx-4 mt-2 rounded-lg px-3 py-2 flex items-start gap-2 shrink-0"
          style={{ background: "hsla(152, 44%, 50%, 0.1)", border: `1px solid hsla(152, 44%, 50%, 0.25)` }}
        >
          <IconCircleCheck size={14} className="mt-0.5 shrink-0" style={{ color: KP.green }} />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold" style={{ color: KP.green }}>
              {invokedResult.name}
            </span>
            <p className="text-[10px] mt-0.5 break-all" style={{ color: KP.muted }}>
              {invokedResult.result.value}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                background: invokedResult.result.fidelity === "lossless" ? "hsla(152, 44%, 50%, 0.15)" : "hsla(38, 60%, 55%, 0.15)",
                color: invokedResult.result.fidelity === "lossless" ? KP.green : KP.gold,
              }}>
                {invokedResult.result.fidelity}
              </span>
            </div>
          </div>
          <button onClick={() => setInvokedResult(null)} className="shrink-0 mt-0.5">
            <IconX size={12} style={{ color: KP.dim }} />
          </button>
        </div>
      )}

      {/* ── Package list ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ scrollbarWidth: "thin" }}>
        {[...grouped.entries()].map(([tierLabel, entries]) => {
          const tier = entries[0].tier;
          return (
            <div key={tierLabel} className="mb-3">
              {/* Tier header */}
              <div className="flex items-center gap-2 py-1.5 sticky top-0 z-10" style={{ background: KP.bg }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tier.color }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tier.color }}>
                  {tierLabel}
                </span>
                <span className="text-[10px]" style={{ color: KP.dim }}>
                  ({entries.length})
                </span>
                <div className="flex-1 h-px" style={{ background: KP.border }} />
              </div>

              {/* Package rows */}
              {entries.map(pkg => {
                const isExpanded = expandedPkg === pkg.name;
                return (
                  <div
                    key={pkg.name}
                    className="rounded-lg mb-1 transition-colors"
                    style={{
                      background: isExpanded ? KP.card : "transparent",
                      border: isExpanded ? `1px solid ${KP.cardBorder}` : "1px solid transparent",
                    }}
                  >
                    {/* Row */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer group"
                      onClick={() => setExpandedPkg(isExpanded ? null : pkg.name)}
                    >
                      {/* Status dot */}
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: KP.green }} />
                      {/* Name */}
                      <span className="text-[12px] font-medium flex-1 truncate" style={{ color: KP.text }}>
                        {pkg.name}
                      </span>
                      {/* Fidelity badge */}
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: pkg.fidelity === "lossless" ? "hsla(152, 44%, 50%, 0.12)" : "hsla(38, 60%, 55%, 0.12)",
                          color: pkg.fidelity === "lossless" ? KP.green : KP.gold,
                          fontWeight: 600,
                        }}
                      >
                        {pkg.fidelity}
                      </span>
                      {/* Invoke button */}
                      <button
                        onClick={e => { e.stopPropagation(); invoke(pkg.name); }}
                        className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "hsla(38, 60%, 55%, 0.15)" }}
                        title={`Invoke ${pkg.name} projection`}
                      >
                        <IconPlayerPlay size={12} style={{ color: KP.gold }} />
                      </button>
                      {/* Expand chevron */}
                      <IconChevronDown
                        size={12}
                        className="shrink-0 transition-transform duration-150"
                        style={{
                          color: KP.dim,
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                        }}
                      />
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 pb-2.5 pt-0 space-y-1.5">
                        {/* Spec URL */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: KP.dim }}>Spec</span>
                          <a
                            href={pkg.spec}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] truncate hover:underline flex items-center gap-1"
                            style={{ color: KP.gold }}
                          >
                            {pkg.spec.replace(/^https?:\/\//, "")}
                            <IconExternalLink size={10} />
                          </a>
                        </div>
                        {/* Loss warning */}
                        {pkg.lossWarning && (
                          <div className="flex items-start gap-1.5">
                            <IconAlertTriangle size={11} className="mt-0.5 shrink-0" style={{ color: KP.gold }} />
                            <span className="text-[10px]" style={{ color: KP.muted }}>{pkg.lossWarning}</span>
                          </div>
                        )}
                        {/* Lens blueprint info */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: KP.dim }}>Blueprint</span>
                          <span className="text-[10px] font-mono" style={{ color: KP.muted }}>
                            morphism:Isometry → {pkg.fidelity === "lossless" ? "identity" : "truncation"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: KP.dim }}>Type</span>
                          <span className="text-[10px]" style={{ color: KP.muted }}>
                            Pure function • Stateless • Deterministic
                          </span>
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
    </div>
  );
}
