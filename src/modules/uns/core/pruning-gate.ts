/**
 * Pruning Gate. System Hygiene Analyzer
 * ═══════════════════════════════════════
 *
 * The dual of the Coherence Gate. Where the Coherence Gate verifies that
 * everything that exists is correct, the Pruning Gate identifies what
 * should NOT exist — redundancy, bloat, unused paths, and complexity
 * that has exceeded its informational value.
 *
 * Principle: Intelligence seeks simplicity. A system's quality is measured
 * not by what it contains, but by what it has eliminated.
 *
 * @module uns/core/pruning-gate
 */

import { SPECS } from "./hologram/specs";
import { SYNERGY_CHAINS, CLUSTERS } from "./hologram/synergies";

// ── Types ─────────────────────────────────────────────────────────────────

export type Severity = "prune" | "simplify" | "monitor";

export interface PruningFinding {
  readonly severity: Severity;
  readonly category: string;
  readonly title: string;
  readonly detail: string;
  readonly estimatedSavings?: number;
}

export interface PruningMetrics {
  readonly totalModules: number;
  readonly activeModules: number;
  readonly absorbedModules: number;
  readonly totalProjections: number;
  readonly totalSynergyChains: number;
  readonly totalClusters: number;
  readonly projectionToChainRatio: number;
  readonly orphanedProjections: number;
  readonly duplicateClusterMembers: number;
  readonly averageChainLength: number;
  readonly maxChainLength: number;
  readonly consolidationDebt: number;
}

export interface PruningReport {
  readonly timestamp: string;
  readonly metrics: PruningMetrics;
  readonly findings: readonly PruningFinding[];
  readonly score: number;
}

// ── Module inventory (source of truth: src/modules/) ─────────────────────

const ACTIVE_MODULES = [
  // Layer 0: Presentation & Shell
  "core", "landing", "desktop", "boot",
  // Layer 1: Engine & Algebra
  "engine", "ring-core", "identity", "morphism",
  // Layer 2: Knowledge Graph & Derivation
  "knowledge-graph", "derivation", "epistemic", "sparql",
  // Layer 3: Resolution & Observability
  "resolver", "observable", "state", "trace",
  // Layer 4: Verification & Tools
  "verify", "agent-tools", "code-kg", "uns",
  // Layer 5: Features
  "atlas", "audio", "bitcoin", "certificate", "community",
  "console", "datum", "hologram-ui", "interoperability",
  "mcp", "oracle", "projects", "quantum", "qsvg",
  "sovereign-vault", "trust-graph", "uor-sdk",
] as const;

// Modules logically absorbed into parents. Directory may still exist.
const ABSORBED_MODULES: Readonly<Record<string, string>> = {
  "triad":          "ring-core",
  "donate":         "community",
  "shacl":          "sparql",
  "jsonld":         "knowledge-graph",
  "qr-cartridge":   "identity",
  "messenger":      "community",
  "data-bank":      "sovereign-vault",
  "semantic-index": "knowledge-graph",
  "bulk-pin":       "oracle",
  "ruliad":         "ring-core",
  "uor-terms":      "ring-core",
  "opportunities":  "hologram-ui",
  "kg-store":       "knowledge-graph",
};

// Candidates for future consolidation: [moduleA, moduleB, rationale]
const CONSOLIDATION_CANDIDATES: readonly [string, string, string][] = [
  // Currently empty — all identified merges have been executed or scheduled
];

// ── Gate Implementation ───────────────────────────────────────────────────

export function pruningGate(): PruningReport {
  const findings: PruningFinding[] = [];
  const moduleCount = ACTIVE_MODULES.length;
  const absorbedCount = Object.keys(ABSORBED_MODULES).length;

  // ── 1. Module proliferation ────────────────────────────────────────────
  if (moduleCount > 35) {
    findings.push({
      severity: moduleCount > 45 ? "simplify" : "monitor",
      category: "module-count",
      title: `${moduleCount} active modules`,
      detail: `Target: ≤30 focused modules. ${absorbedCount} already absorbed.`,
      estimatedSavings: (moduleCount - 30) * 50,
    });
  }

  // ── 2. Consolidation candidates ────────────────────────────────────────
  for (const [a, b, reason] of CONSOLIDATION_CANDIDATES) {
    if (ACTIVE_MODULES.includes(a as any) && ACTIVE_MODULES.includes(b as any)) {
      findings.push({
        severity: "simplify",
        category: "module-consolidation",
        title: `Consolidate "${a}" + "${b}"`,
        detail: reason,
        estimatedSavings: 100,
      });
    }
  }

  // ── 3. Projection registry analysis ────────────────────────────────────
  const projCount = SPECS.size;
  const chainedProjections = new Set<string>();
  for (const chain of SYNERGY_CHAINS) {
    for (const p of chain.projections) chainedProjections.add(p);
  }
  const clusteredProjections = new Set<string>();
  for (const members of Object.values(CLUSTERS)) {
    for (const m of members) clusteredProjections.add(m);
  }
  const allConnected = new Set([...chainedProjections, ...clusteredProjections]);
  const orphaned: string[] = [];
  for (const [name] of SPECS) {
    if (!allConnected.has(name)) orphaned.push(name);
  }
  if (orphaned.length > 0) {
    findings.push({
      severity: "monitor",
      category: "orphaned-projections",
      title: `${orphaned.length} projections unconnected`,
      detail: `Not in any synergy chain: ${orphaned.slice(0, 12).join(", ")}${orphaned.length > 12 ? ` (+${orphaned.length - 12} more)` : ""}.`,
    });
  }

  // ── 4. Cluster duplication ─────────────────────────────────────────────
  const memberCounts = new Map<string, number>();
  for (const members of Object.values(CLUSTERS)) {
    for (const m of members) memberCounts.set(m, (memberCounts.get(m) || 0) + 1);
  }
  const duplicateMembers = [...memberCounts.entries()].filter(([, c]) => c > 3);
  if (duplicateMembers.length > 0) {
    findings.push({
      severity: "monitor",
      category: "cluster-overlap",
      title: `${duplicateMembers.length} projections in 4+ clusters`,
      detail: duplicateMembers.map(([n, c]) => `${n}(${c})`).join(", "),
    });
  }

  // ── 5. Chain length analysis ───────────────────────────────────────────
  const chainLengths = SYNERGY_CHAINS.map(c => c.projections.length);
  const maxChain = Math.max(...chainLengths);
  const avgChain = chainLengths.reduce((a, b) => a + b, 0) / chainLengths.length;
  if (maxChain > 10) {
    findings.push({
      severity: "monitor",
      category: "chain-complexity",
      title: `Longest chain: ${maxChain} nodes`,
      detail: "Consider splitting chains >10 nodes into sub-chains.",
    });
  }

  // ── 6. Consolidation debt ──────────────────────────────────────────────
  // Absorbed modules whose directories still exist on disk
  const consolidationDebt = absorbedCount;
  if (consolidationDebt > 5) {
    findings.push({
      severity: "monitor",
      category: "consolidation-debt",
      title: `${consolidationDebt} absorbed modules tracked`,
      detail: `Absorbed → parent: ${Object.entries(ABSORBED_MODULES).map(([k, v]) => `${k}→${v}`).join(", ")}`,
    });
  }

  // ── Compute score ──────────────────────────────────────────────────────
  const deductions = findings.reduce((sum, f) => {
    if (f.severity === "prune") return sum + 15;
    if (f.severity === "simplify") return sum + 8;
    return sum + 2;
  }, 0);
  const score = Math.max(0, Math.min(100, 100 - deductions));

  return {
    timestamp: new Date().toISOString(),
    metrics: {
      totalModules: moduleCount + absorbedCount,
      activeModules: moduleCount,
      absorbedModules: absorbedCount,
      totalProjections: projCount,
      totalSynergyChains: SYNERGY_CHAINS.length,
      totalClusters: Object.keys(CLUSTERS).length,
      projectionToChainRatio: Math.round((projCount / SYNERGY_CHAINS.length) * 10) / 10,
      orphanedProjections: orphaned.length,
      duplicateClusterMembers: duplicateMembers.length,
      averageChainLength: Math.round(avgChain * 10) / 10,
      maxChainLength: maxChain,
      consolidationDebt,
    },
    findings: findings.sort((a, b) => {
      const order: Record<Severity, number> = { prune: 0, simplify: 1, monitor: 2 };
      return order[a.severity] - order[b.severity];
    }),
    score,
  };
}
