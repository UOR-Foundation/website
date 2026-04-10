/**
 * Ontology Audience Profiles
 * ═════════════════════════════════════════════════════════════════
 *
 * Each profile maps the canonical vocabulary to labels appropriate
 * for a specific audience: developers, end-users, or ML scientists.
 *
 * @module ontology/profiles
 */

import type { OntologyProfile, SkosConcept } from "./types";

/**
 * Resolve the display label for a concept under a given profile.
 *
 * Priority:
 *   1. Profile-specific label from `uor:profileLabels`
 *   2. Canonical `skos:prefLabel` (developer-facing default)
 */
export function labelForProfile(
  concept: SkosConcept,
  profile: OntologyProfile,
): string {
  return concept["uor:profileLabels"][profile] ?? concept["skos:prefLabel"];
}

/**
 * Get a human-readable description of what each profile provides.
 */
export function describeProfile(profile: OntologyProfile): string {
  switch (profile) {
    case "developer":
      return "Industry-standard DevOps / CNCF terminology familiar to Kubernetes, Docker, and cloud-native engineers.";
    case "user":
      return "Simplified, non-technical labels that describe functionality without jargon.";
    case "scientist":
      return "Formal mathematical and computational science terminology for ML researchers and theoreticians.";
  }
}

/** All available profiles. */
export const ALL_PROFILES: readonly OntologyProfile[] = [
  "developer",
  "user",
  "scientist",
] as const;
