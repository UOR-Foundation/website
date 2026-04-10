/**
 * Canonical Compliance — Audit Engine
 * ═════════════════════════════════════════════════════════════════
 *
 * Walks the provenance map, validates every atom reference,
 * and computes the system-wide Grounding Score.
 *
 * @version 1.0.0
 */

import { ATOM_INDEX, type UorAtom } from "./atoms";
import { flattenProvenance, type ProvenanceEntry } from "./provenance-map";

// ── Audit Result Types ──────────────────────────────────────────

export interface AuditFinding {
  module: string;
  export: string;
  status: "grounded" | "partial" | "ungrounded";
  validAtoms: string[];
  invalidAtoms: string[];
  pipeline: string;
}

export interface AuditReport {
  timestamp: string;
  totalExports: number;
  groundedCount: number;
  partialCount: number;
  ungroundedCount: number;
  groundingScore: number;       // 0–100
  findings: AuditFinding[];
  atomCoverage: AtomCoverage[];
}

export interface AtomCoverage {
  atom: UorAtom;
  referencedBy: number;         // how many exports reference this atom
}

// ── Audit Logic ─────────────────────────────────────────────────

/**
 * Run a full provenance audit across all registered modules.
 * Returns a complete report with grounding score.
 */
export function runAudit(): AuditReport {
  const entries = flattenProvenance();
  const atomUsage = new Map<string, number>();

  // Initialize usage counters
  for (const [id] of ATOM_INDEX) {
    atomUsage.set(id, 0);
  }

  const findings: AuditFinding[] = entries.map((entry) => {
    const validAtoms: string[] = [];
    const invalidAtoms: string[] = [];

    for (const atomId of entry.atoms) {
      if (ATOM_INDEX.has(atomId)) {
        validAtoms.push(atomId);
        atomUsage.set(atomId, (atomUsage.get(atomId) ?? 0) + 1);
      } else {
        invalidAtoms.push(atomId);
      }
    }

    const status: AuditFinding["status"] =
      entry.atoms.length === 0
        ? "ungrounded"
        : invalidAtoms.length === 0
          ? "grounded"
          : "partial";

    return {
      module: entry.module,
      export: entry.export,
      status,
      validAtoms,
      invalidAtoms,
      pipeline: entry.pipeline,
    };
  });

  const groundedCount = findings.filter((f) => f.status === "grounded").length;
  const partialCount = findings.filter((f) => f.status === "partial").length;
  const ungroundedCount = findings.filter((f) => f.status === "ungrounded").length;
  const groundingScore =
    entries.length > 0
      ? Math.round((groundedCount / entries.length) * 100)
      : 0;

  const atomCoverage: AtomCoverage[] = [];
  for (const [id, count] of atomUsage) {
    const atom = ATOM_INDEX.get(id);
    if (atom) atomCoverage.push({ atom, referencedBy: count });
  }
  atomCoverage.sort((a, b) => b.referencedBy - a.referencedBy);

  return {
    timestamp: new Date().toISOString(),
    totalExports: entries.length,
    groundedCount,
    partialCount,
    ungroundedCount,
    groundingScore,
    findings,
    atomCoverage,
  };
}

/**
 * Quick check: returns the grounding score without full report.
 */
export function getGroundingScore(): number {
  const entries = flattenProvenance();
  if (entries.length === 0) return 0;
  const grounded = entries.filter((e) =>
    e.atoms.length > 0 && e.atoms.every((a) => ATOM_INDEX.has(a)),
  ).length;
  return Math.round((grounded / entries.length) * 100);
}
