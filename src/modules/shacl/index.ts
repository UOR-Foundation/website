/**
 * shacl module barrel export.
 */

export { DatumShape, DerivationShape, CertificateShape, PartitionShape, SHAPES, SHAPE_IDS } from "./shapes";
export type { Violation, ShapeResult } from "./shapes";
export { validate, validateOnWrite } from "./validator";
export type { ValidationReport } from "./validator";
export { runConformanceSuite } from "./conformance";
export type { ConformanceTest, ConformanceSuiteResult } from "./conformance";
export { default as ConformancePage } from "./pages/ConformancePage";
