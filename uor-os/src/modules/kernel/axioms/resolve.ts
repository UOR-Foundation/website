/**
 * Axiom Resolution — Lookup, Filter, React Hook
 * ═════════════════════════════════════════════════════════════════
 *
 * @module axioms/resolve
 */

import { useMemo } from "react";
import { getActiveDesignSystem } from "./registry";
import type { AxiomCategory, DesignAxiom, DesignSystem } from "./types";

/** Resolve an axiom by its @id or code (e.g. "A1"). */
export function resolveAxiom(idOrCode: string): DesignAxiom | undefined {
  const ds = getActiveDesignSystem();
  return ds.axioms.find(
    (a) => a["@id"] === idOrCode || a.code === idOrCode || a.label === idOrCode,
  );
}

/** Get all axioms in a category. */
export function axiomsByCategory(category: AxiomCategory): readonly DesignAxiom[] {
  return getActiveDesignSystem().axioms.filter((a) => a.category === category);
}

/** Get all axiom codes as a flat array. */
export function allAxiomCodes(): readonly string[] {
  return getActiveDesignSystem().axioms.map((a) => a.code);
}

/** Get axiom count by category. */
export function axiomCategoryCounts(): Record<AxiomCategory, number> {
  const counts: Record<AxiomCategory, number> = {
    visual: 0,
    interaction: 0,
    architecture: 0,
    data: 0,
  };
  for (const a of getActiveDesignSystem().axioms) {
    counts[a.category]++;
  }
  return counts;
}

/** Export the active design system as a summary markdown string. */
export function exportAxiomsMarkdown(): string {
  const ds = getActiveDesignSystem();
  const lines: string[] = [
    `# ${ds.label} Design System v${ds.version}`,
    "",
    `| Code | Axiom | Category | Principle |`,
    `|------|-------|----------|-----------|`,
  ];
  for (const a of ds.axioms) {
    lines.push(`| ${a.code} | ${a.label} | ${a.category} | ${a.principle} |`);
  }
  return lines.join("\n");
}

// ── React Hook ───────────────────────────────────────────────────────────

/** React hook: resolve a single axiom. */
export function useAxiom(idOrCode: string): DesignAxiom | undefined {
  return useMemo(() => resolveAxiom(idOrCode), [idOrCode]);
}

/** React hook: get the active design system. */
export function useDesignSystem(): DesignSystem {
  return useMemo(() => getActiveDesignSystem(), []);
}
