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

export { PROVENANCE_REGISTRY, flattenProvenance } from "./provenance-map";
export type { ProvenanceEntry, ModuleProvenance } from "./provenance-map";

export { runAudit, getGroundingScore } from "./audit";
export type { AuditReport, AuditFinding, AtomCoverage } from "./audit";

export { buildProvenanceTriples, buildProvenanceAdjacency } from "./provenance-graph";
export type { ProvenanceTriple } from "./provenance-graph";

export { exportMarkdown, exportJsonLd, exportNQuads } from "./export";
