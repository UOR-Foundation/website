/**
 * DevOps Glossary — Backward-Compatible Re-export
 * ═════════════════════════════════════════════════════════════════
 *
 * This module is now a thin shim over the canonical ontology.
 * All terminology is defined in `@/modules/ontology/vocabulary.ts`.
 *
 * Existing consumers of `DEVOPS_GLOSSARY`, `lookupStandard`, and
 * `glossaryToMarkdown` continue to work unchanged.
 *
 * @module canonical-compliance/devops-glossary
 */

import { ALL_CONCEPTS, resolveTerm } from "../ontology";
import type { SkosConcept } from "../ontology";

// ── Legacy GlossaryEntry shape ───────────────────────────────────────────

export interface GlossaryEntry {
  /** Internal system term */
  readonly internal: string;
  /** Standard DevOps / industry term */
  readonly standard: string;
  /** Kubernetes equivalent (if any) */
  readonly k8s?: string;
  /** CNCF project equivalent (if any) */
  readonly cncf?: string;
  /** Brief explanation of the mapping */
  readonly note?: string;
}

/** Convert a SKOS concept to the legacy GlossaryEntry shape. */
function toGlossaryEntry(c: SkosConcept): GlossaryEntry {
  return {
    internal: c["skos:altLabel"][0] ?? c["skos:prefLabel"],
    standard: c["skos:prefLabel"],
    k8s: c["uor:k8sEquivalent"],
    cncf: c["uor:cncfProject"],
    note: c["skos:definition"],
  };
}

/**
 * Legacy glossary derived from the canonical ontology.
 * Only includes concepts that have a CNCF or K8s mapping.
 */
export const DEVOPS_GLOSSARY: readonly GlossaryEntry[] = ALL_CONCEPTS
  .filter((c) => c["uor:k8sEquivalent"] || c["uor:cncfProject"])
  .map(toGlossaryEntry);

/** Look up the standard DevOps term for an internal concept. */
export function lookupStandard(internalTerm: string): GlossaryEntry | undefined {
  const concept = resolveTerm(internalTerm);
  if (!concept) {
    // Fallback: search legacy entries by internal name
    return DEVOPS_GLOSSARY.find(
      (e) => e.internal.toLowerCase() === internalTerm.toLowerCase(),
    );
  }
  return toGlossaryEntry(concept);
}

/** Get all glossary entries as a formatted markdown table. */
export function glossaryToMarkdown(): string {
  const lines = [
    "| Internal Term | Standard DevOps | K8s Equivalent | CNCF Project |",
    "|---|---|---|---|",
  ];
  for (const e of DEVOPS_GLOSSARY) {
    lines.push(
      `| ${e.internal} | ${e.standard} | ${e.k8s ?? "—"} | ${e.cncf ?? "—"} |`,
    );
  }
  return lines.join("\n");
}
