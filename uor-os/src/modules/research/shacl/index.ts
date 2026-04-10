/**
 * shacl module barrel export.
 */

export { DatumShape, DerivationShape, CertificateShape, PartitionShape, SHAPES, SHAPE_IDS } from "./shapes";
export type { Violation, ShapeResult } from "./shapes";
export { validate, validateOnWrite } from "./validator";
export type { ValidationReport } from "./validator";
export { runConformanceSuite } from "./conformance";
export type { ConformanceTest, ConformanceSuiteResult } from "./conformance-types";
export type { ConformanceResult, ConformanceGroup } from "./conformance-types";
export { CANONICAL_PARTITION } from "./conformance-partition";

// ── P25: SHACL Validation Engine (9 shape constraints) ──────────────────────
export { validateShaclShapes, validateShape, shaclGuard, ALL_SHAPE_NAMES } from "./shacl-engine";
export type { ShaclViolation, ShaclResult, ShaclShapeName } from "./shacl-engine";

export { default as ConformancePage } from "./pages/ConformancePage";
