/**
 * Canonical Ontology Module — Barrel Export
 * ═════════════════════════════════════════════════════════════════
 *
 * W3C SKOS-based vocabulary providing a single source of truth for
 * all system terminology with audience-specific labels and
 * CNCF/Kubernetes/UOR mappings.
 *
 * @module ontology
 */

// Register the compliance gate (side-effect import)
import "./gate";

// Types
export type {
  SkosConcept,
  SkosConceptScheme,
  OntologyProfile,
  ProfileLabels,
  ResolvedTerm,
} from "./types";

// Vocabulary
export {
  SYSTEM_ONTOLOGY,
  ALL_CONCEPTS,
  CONCEPT_INDEX,
  LABEL_INDEX,
} from "./vocabulary";

// Profiles
export { labelForProfile, describeProfile, ALL_PROFILES } from "./profiles";

// Resolution
export {
  resolveTerm,
  resolveLabel,
  resolveTermFull,
  allKnownTerms,
  useOntologyLabel,
} from "./resolve";
