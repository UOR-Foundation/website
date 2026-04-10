/**
 * Canonical Compliance Engine — Barrel Export
 * ═════════════════════════════════════════════════════════════════
 *
 * Provenance audit from UOR atoms to every module.
 *
 * @version 1.0.0
 */

export { ALL_ATOMS, ATOM_INDEX, isValidAtom } from "./atoms";
export type { UorAtom, AtomCategory } from "./atoms";

export { PROVENANCE_REGISTRY, SYSTEM_LAYERS, flattenProvenance } from "./provenance-map";
export type { ProvenanceEntry, ModuleProvenance, SystemLayer } from "./provenance-map";

export { runAudit, getGroundingScore } from "./audit";
export type { AuditReport, AuditFinding, AtomCoverage } from "./audit";

export { buildProvenanceTriples, buildProvenanceAdjacency } from "./provenance-graph";
export type { ProvenanceTriple } from "./provenance-graph";

export { exportMarkdown, exportJsonLd, exportNQuads } from "./export";

export { runAllGates, runAllGatesAsync, exportGatesMarkdown } from "./gates";
export type { GateResult, GateFinding, GateReport, AsyncGate } from "./gates";

export { DEVOPS_GLOSSARY, lookupStandard, glossaryToMarkdown } from "./devops-glossary";
export type { GlossaryEntry } from "./devops-glossary";

// Ontology re-exports for convenience
export {
  SYSTEM_ONTOLOGY,
  ALL_CONCEPTS,
  resolveTerm,
  resolveLabel,
  useOntologyLabel,
} from "../ontology";
export type { SkosConcept, OntologyProfile, ResolvedTerm } from "../ontology";

// Axioms re-exports for convenience
export {
  ALGEBRICA,
  ALGEBRICA_AXIOMS,
  resolveAxiom,
  useAxiom,
  useDesignSystem,
  exportAxiomsMarkdown,
  getActiveDesignSystem,
  setActiveDesignSystem,
} from "../axioms";
export type { DesignAxiom, DesignSystem, AxiomCategory } from "../axioms";
