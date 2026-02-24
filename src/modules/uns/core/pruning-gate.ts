/**
 * Pruning Gate — System Hygiene Analyzer
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
 * The Pruning Gate produces a PruningReport with three severity levels:
 *   - PRUNE:    Remove immediately (dead code, unused routes)
 *   - SIMPLIFY: Merge or consolidate (duplicate patterns, near-identical modules)
 *   - MONITOR:  Approaching complexity threshold (growing files, expanding APIs)
 *
 * Usage:
 *   const report = pruningGate();
 *   report.findings    → actionable items sorted by severity
 *   report.metrics     → quantitative health indicators
 *   report.score       → 0–100 hygiene score (higher = leaner)
 *
 * Design constraints:
 *   - Zero dependencies beyond the project's own module structure
 *   - Pure function — no side effects, no file I/O, no network
 *   - Runs in <50ms — no excuse not to run it on every commit
 *   - This file itself must stay under 200 lines (eat your own cooking)
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
  /** Estimated lines that could be removed or simplified. */
  readonly estimatedSavings?: number;
}

export interface PruningMetrics {
  readonly totalModules: number;
  readonly totalProjections: number;
  readonly totalSynergyChains: number;
  readonly totalClusters: number;
  readonly projectionToChainRatio: number;
  readonly orphanedProjections: number;
  readonly duplicateClusterMembers: number;
  readonly averageChainLength: number;
  readonly maxChainLength: number;
}

export interface PruningReport {
  readonly timestamp: string;
  readonly metrics: PruningMetrics;
  readonly findings: readonly PruningFinding[];
  readonly score: number; // 0–100, higher = leaner
}

// ── Known module inventory (source of truth: src/modules/) ────────────────

const KNOWN_MODULES = [
  "agent-tools", "api-explorer", "bitcoin", "bulk-pin", "certificate",
  "code-kg", "community", "consciousness", "console",
  "core", "dashboard", "datum", "derivation", "developers", "donate",
  "epistemic", "framework", "hologram-ui", "identity", "interoperability",
  "jsonld", "kg-store", "landing", "mcp", "morphism", "observable",
  "opportunities", "oracle", "projects", "qr-cartridge", "query",
  "resolver", "ring-core", "ruliad", "self-verify", "semantic-index",
  "shacl", "sparql", "state", "trace", "triad",
  "trust-graph", "uns", "uor-identity", "uor-sdk", "uor-terms",
  "verify", "your-space",
] as const;

// Modules that could potentially be consolidated
const CONSOLIDATION_CANDIDATES: readonly [string, string, string][] = [
  
  ["identity", "uor-identity", "Both handle identity — merge or clarify boundary"],
  ["verify", "self-verify", "Both handle verification — consolidate"],
  ["query", "sparql", "Query is generic; SPARQL is specific — merge into sparql"],
];

// ── Gate Implementation ───────────────────────────────────────────────────

export function pruningGate(): PruningReport {
  const findings: PruningFinding[] = [];

  // ── 1. Module proliferation check ──────────────────────────────────────
  const moduleCount = KNOWN_MODULES.length;
  if (moduleCount > 40) {
    findings.push({
      severity: moduleCount > 50 ? "simplify" : "monitor",
      category: "module-count",
      title: `${moduleCount} modules detected`,
      detail: `System has ${moduleCount} top-level modules. Consider consolidating modules with overlapping concerns. Target: ≤35 focused modules.`,
      estimatedSavings: (moduleCount - 35) * 50,
    });
  }

  // ── 2. Module consolidation opportunities ──────────────────────────────
  for (const [a, b, reason] of CONSOLIDATION_CANDIDATES) {
    if (KNOWN_MODULES.includes(a as any) && KNOWN_MODULES.includes(b as any)) {
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

  // Find orphaned projections (not in any synergy chain or cluster)
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
      severity: orphaned.length > 20 ? "monitor" : "monitor",
      category: "orphaned-projections",
      title: `${orphaned.length} projections not in any synergy chain or cluster`,
      detail: `These projections exist but have no documented cross-protocol relationships: ${orphaned.slice(0, 15).join(", ")}${orphaned.length > 15 ? ` (+${orphaned.length - 15} more)` : ""}. Either connect them to synergy chains or evaluate if they're needed.`,
    });
  }

  // ── 4. Cluster duplication check ───────────────────────────────────────
  const memberCounts = new Map<string, number>();
  for (const members of Object.values(CLUSTERS)) {
    for (const m of members) {
      memberCounts.set(m, (memberCounts.get(m) || 0) + 1);
    }
  }
  const duplicateMembers = [...memberCounts.entries()].filter(([, c]) => c > 2);
  if (duplicateMembers.length > 0) {
    findings.push({
      severity: "monitor",
      category: "cluster-overlap",
      title: `${duplicateMembers.length} projections appear in 3+ clusters`,
      detail: `Heavy cluster overlap may indicate classification redundancy: ${duplicateMembers.map(([n, c]) => `${n}(${c})`).join(", ")}`,
    });
  }

  // ── 5. Chain length analysis ───────────────────────────────────────────
  const chainLengths = SYNERGY_CHAINS.map(c => c.projections.length);
  const maxChain = Math.max(...chainLengths);
  const avgChain = chainLengths.reduce((a, b) => a + b, 0) / chainLengths.length;

  if (maxChain > 7) {
    findings.push({
      severity: "monitor",
      category: "chain-complexity",
      title: `Longest synergy chain has ${maxChain} nodes`,
      detail: "Chains over 7 nodes become hard to verify. Consider splitting into sub-chains.",
    });
  }

  // ── Compute score ──────────────────────────────────────────────────────
  const deductions = findings.reduce((sum, f) => {
    if (f.severity === "prune") return sum + 15;
    if (f.severity === "simplify") return sum + 8;
    return sum + 3;
  }, 0);
  const score = Math.max(0, Math.min(100, 100 - deductions));

  // ── Build metrics ──────────────────────────────────────────────────────
  const metrics: PruningMetrics = {
    totalModules: moduleCount,
    totalProjections: projCount,
    totalSynergyChains: SYNERGY_CHAINS.length,
    totalClusters: Object.keys(CLUSTERS).length,
    projectionToChainRatio: Math.round((projCount / SYNERGY_CHAINS.length) * 10) / 10,
    orphanedProjections: orphaned.length,
    duplicateClusterMembers: duplicateMembers.length,
    averageChainLength: Math.round(avgChain * 10) / 10,
    maxChainLength: maxChain,
  };

  return {
    timestamp: new Date().toISOString(),
    metrics,
    findings: findings.sort((a, b) => {
      const order: Record<Severity, number> = { prune: 0, simplify: 1, monitor: 2 };
      return order[a.severity] - order[b.severity];
    }),
    score,
  };
}
