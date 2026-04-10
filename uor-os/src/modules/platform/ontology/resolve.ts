/**
 * Ontology Resolution — Term Lookup & React Hook
 * ═════════════════════════════════════════════════════════════════
 *
 * Resolves any internal or external term to its canonical concept
 * and returns the audience-appropriate label.
 *
 * @module ontology/resolve
 */

import { useMemo } from "react";
import type { OntologyProfile, ResolvedTerm, SkosConcept } from "./types";
import { ALL_CONCEPTS, CONCEPT_INDEX, LABEL_INDEX } from "./vocabulary";
import { labelForProfile } from "./profiles";

/**
 * Resolve a term (internal name, prefLabel, altLabel, or @id) to
 * its canonical SKOS concept.
 *
 * Returns undefined if no concept matches.
 */
export function resolveTerm(term: string): SkosConcept | undefined {
  // Try @id first
  const byId = CONCEPT_INDEX.get(term) ?? CONCEPT_INDEX.get(`uor:${term}`);
  if (byId) return byId;

  // Try label index (case-insensitive)
  return LABEL_INDEX.get(term.toLowerCase());
}

/**
 * Resolve a term and return the profile-specific label.
 *
 * Returns the original term if no concept matches (graceful fallback).
 */
export function resolveLabel(
  term: string,
  profile: OntologyProfile = "developer",
): string {
  const concept = resolveTerm(term);
  if (!concept) return term;
  return labelForProfile(concept, profile);
}

/**
 * Full resolution: returns the concept, label, and how it was matched.
 */
export function resolveTermFull(
  term: string,
  profile: OntologyProfile = "developer",
): ResolvedTerm | undefined {
  const byId = CONCEPT_INDEX.get(term) ?? CONCEPT_INDEX.get(`uor:${term}`);
  if (byId) {
    return {
      concept: byId,
      label: labelForProfile(byId, profile),
      matchedVia: "id",
    };
  }

  const lower = term.toLowerCase();
  const byLabel = LABEL_INDEX.get(lower);
  if (byLabel) {
    const isPref = byLabel["skos:prefLabel"].toLowerCase() === lower;
    return {
      concept: byLabel,
      label: labelForProfile(byLabel, profile),
      matchedVia: isPref ? "prefLabel" : "altLabel",
    };
  }

  return undefined;
}

/**
 * Get all known alt labels (internal terms) that map to canonical concepts.
 * Useful for linting: if a codebase term is NOT in this set, it may be
 * an undeclared synonym.
 */
export function allKnownTerms(): ReadonlySet<string> {
  const terms = new Set<string>();
  for (const c of ALL_CONCEPTS) {
    terms.add(c["skos:prefLabel"].toLowerCase());
    for (const alt of c["skos:altLabel"]) {
      terms.add(alt.toLowerCase());
    }
  }
  return terms;
}

// ── React Hook ───────────────────────────────────────────────────────────

/**
 * React hook that resolves a term to the appropriate label for the
 * current audience profile.
 *
 * @example
 * ```tsx
 * const label = useOntologyLabel("Sovereign Bus", "developer");
 * // → "Service Mesh"
 * ```
 */
export function useOntologyLabel(
  term: string,
  profile: OntologyProfile = "developer",
): string {
  return useMemo(() => resolveLabel(term, profile), [term, profile]);
}
