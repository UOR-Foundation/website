/**
 * Model Fingerprint Card — Atlas Nutritional Label for LLMs
 * ══════════════════════════════════════════════════════════
 */

import React, { useMemo, useState } from "react";
import { fingerprint, fingerprintAll, type ModelFingerprint } from "../fingerprint";
import { MODEL_CATALOG } from "../convergence";

// ── Operation bar colors (exceptional group palette) ──────────────────────
const OP_COLORS: Record<string, string> = {
  product:      "hsl(38, 70%, 55%)",    // G₂ gold
  quotient:     "hsl(280, 60%, 60%)",   // F₄ violet
  filtration:   "hsl(200, 70%, 55%)",   // E₆ blue
  augmentation: "hsl(150, 60%, 50%)",   // E₇ emerald
  embedding:    "hsl(0, 65%, 58%)",     // E₈ crimson
};

const OP_GROUPS: Record<string, string> = {
  product: "G₂", quotient: "F₄", filtration: "E₆",
  augmentation: "E₇", embedding: "E₈",
};

const FIDELITY_COLORS: Record<string, string> = {
  lossless: "hsl(150, 70%, 50%)",
  "near-lossless": "hsl(200, 70%, 55%)",
  lossy: "hsl(38, 70%, 55%)",
  compressed: "hsl(0, 65%, 58%)",
};

// ── Single Fingerprint Card ───────────────────────────────────────────────

function FingerprintCard({ fp }: { fp: ModelFingerprint }) {
  const profileEntries = Object.entries(fp.operationProfile) as [string, number][];

  return (
    <div className="rounded-lg border border-[hsla(210,15%,30%,0.4)] bg-[hsla(230,15%,12%,0.8)] p-4 hover:border-[hsla(38,50%,50%,0.4)] transition-colors">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[hsl(210,10%,90%)]">{fp.model}</h3>
          <span className="text-[11px] font-mono text-[hsl(210,10%,50%)]">{fp.family} · {fp.paramsB}B params</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${FIDELITY_COLORS[fp.fidelityClass]}20`,
              color: FIDELITY_COLORS[fp.fidelityClass],
            }}
          >
            {fp.fidelityClass}
          </span>
        </div>
      </div>

      {/* Operation Profile Bar */}
      <div className="mb-3">
        <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] mb-1">CATEGORICAL OPERATION PROFILE</div>
        <div className="flex h-3 rounded-full overflow-hidden bg-[hsla(210,10%,20%,0.5)]">
          {profileEntries.map(([op, weight]) => (
            <div
              key={op}
              style={{
                width: `${weight * 100}%`,
                backgroundColor: OP_COLORS[op],
                minWidth: weight > 0.01 ? 2 : 0,
              }}
              title={`${OP_GROUPS[op]} ${op}: ${(weight * 100).toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {profileEntries.map(([op, weight]) => (
            weight > 0.01 ? (
              <span key={op} className="text-[9px] font-mono" style={{ color: OP_COLORS[op] }}>
                {OP_GROUPS[op]} {(weight * 100).toFixed(0)}%
              </span>
            ) : null
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <MetricCell label="R₈ Rings" value={String(fp.r8Rings)} />
        <MetricCell label="Sign Class" value={`σ${fp.signClass}`} />
        <MetricCell label="Resonance" value={`${(fp.atlasResonance * 100).toFixed(0)}%`} />
        <MetricCell label="Regularity" value={`${(fp.regularityScore * 100).toFixed(0)}%`} />
      </div>

      {/* Structural Signature */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] font-mono text-[hsl(210,10%,45%)]">SIG</span>
        <div className="flex gap-[2px]">
          {fp.signature.binary.split("").map((bit, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[2px] text-[8px] flex items-center justify-center font-mono"
              style={{
                backgroundColor: bit === "1" ? "hsl(38, 60%, 50%)" : "hsla(210, 10%, 25%, 0.5)",
                color: bit === "1" ? "hsl(38, 90%, 95%)" : "hsl(210, 10%, 40%)",
              }}
            >
              {bit}
            </div>
          ))}
        </div>
        <span className="text-[9px] font-mono text-[hsl(210,10%,40%)] ml-auto">
          {fp.dominantGroup} dominant
        </span>
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[13px] font-mono text-[hsl(210,10%,85%)]">{value}</div>
      <div className="text-[9px] font-mono text-[hsl(210,10%,45%)]">{label}</div>
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────

function OperationLegend() {
  const items = [
    { op: "product", group: "G₂", label: "Product (Attention Heads)", roots: 12 },
    { op: "quotient", group: "F₄", label: "Quotient (LayerNorm)", roots: 48 },
    { op: "filtration", group: "E₆", label: "Filtration (QKV Split)", roots: 72 },
    { op: "augmentation", group: "E₇", label: "Augmentation (FFN)", roots: 126 },
    { op: "embedding", group: "E₈", label: "Embedding (Residual)", roots: 240 },
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {items.map(item => (
        <div key={item.op} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-[2px]"
            style={{ backgroundColor: OP_COLORS[item.op] }}
          />
          <span className="text-[10px] font-mono text-[hsl(210,10%,55%)]">
            {item.group} {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Summary Stats ─────────────────────────────────────────────────────────

function SummaryStats({ fingerprints }: { fingerprints: ModelFingerprint[] }) {
  const families = [...new Set(fingerprints.map(f => f.family))].length;
  const avgResonance = fingerprints.reduce((s, f) => s + f.atlasResonance, 0) / fingerprints.length;
  const allAugDominant = fingerprints.every(f => f.dominantOperation === "augmentation");

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <StatCard label="Models Analyzed" value={String(fingerprints.length)} />
      <StatCard label="Model Families" value={String(families)} />
      <StatCard label="Avg Resonance" value={`${(avgResonance * 100).toFixed(0)}%`} />
      <StatCard
        label="Universal Invariant"
        value={allAugDominant ? "E₇ DOMINANT" : "MIXED"}
        highlight={allAugDominant}
      />
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${
      highlight
        ? "border-[hsla(150,60%,50%,0.4)] bg-[hsla(150,60%,20%,0.15)]"
        : "border-[hsla(210,15%,30%,0.3)] bg-[hsla(230,15%,12%,0.5)]"
    }`}>
      <div className={`text-[18px] font-mono font-bold ${
        highlight ? "text-[hsl(150,60%,60%)]" : "text-[hsl(38,50%,65%)]"
      }`}>
        {value}
      </div>
      <div className="text-[10px] font-mono text-[hsl(210,10%,45%)] mt-0.5">{label}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function ModelFingerprintPanel() {
  const fingerprints = useMemo(() => fingerprintAll(), []);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const families = useMemo(() => [...new Set(fingerprints.map(f => f.family))], [fingerprints]);

  const displayed = selectedFamily
    ? fingerprints.filter(f => f.family === selectedFamily)
    : fingerprints;

  return (
    <div className="p-4">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-[16px] font-mono tracking-wide text-[hsl(38,50%,65%)]">
          UNIVERSAL MODEL FINGERPRINT
        </h2>
        <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-1">
          Atlas-based nutritional label for {fingerprints.length} LLM architectures across {families.length} families
        </p>
      </div>

      {/* Summary */}
      <SummaryStats fingerprints={fingerprints} />

      {/* Legend */}
      <OperationLegend />

      {/* Family Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedFamily(null)}
          className={`text-[11px] font-mono px-2.5 py-1 rounded-md transition-colors ${
            !selectedFamily
              ? "bg-[hsla(38,50%,50%,0.2)] text-[hsl(38,50%,65%)] border border-[hsla(38,50%,50%,0.3)]"
              : "text-[hsl(210,10%,50%)] border border-[hsla(210,15%,30%,0.3)] hover:border-[hsla(210,15%,40%,0.4)]"
          }`}
        >
          All ({fingerprints.length})
        </button>
        {families.map(f => {
          const count = fingerprints.filter(fp => fp.family === f).length;
          return (
            <button
              key={f}
              onClick={() => setSelectedFamily(f === selectedFamily ? null : f)}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-md transition-colors ${
                selectedFamily === f
                  ? "bg-[hsla(38,50%,50%,0.2)] text-[hsl(38,50%,65%)] border border-[hsla(38,50%,50%,0.3)]"
                  : "text-[hsl(210,10%,50%)] border border-[hsla(210,15%,30%,0.3)] hover:border-[hsla(210,15%,40%,0.4)]"
              }`}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {displayed.map(fp => (
          <FingerprintCard key={fp.model} fp={fp} />
        ))}
      </div>

      {/* Footer invariant */}
      <div className="mt-6 text-center">
        <p className="text-[10px] font-mono text-[hsl(210,10%,40%)]">
          UNIVERSAL THEOREM: Every model is E₇-dominant because FFN augmentation (d→4d→d)
          dominates FLOPs. The scaling law IS the exceptional group chain G₂ ⊂ F₄ ⊂ E₆ ⊂ E₇ ⊂ E₈.
        </p>
      </div>
    </div>
  );
}
