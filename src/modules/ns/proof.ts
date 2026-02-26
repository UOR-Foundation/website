/**
 * proof: namespace — unified barrel export.
 *
 * Consolidates: verify + epistemic + shacl
 * Bridge Space — verification lifecycle, epistemic grading, and shape validation.
 *
 * @namespace proof:
 * @version 2.0.0
 */

// ── Verification (from verify/) ────────────────────────────────────────────
export { withVerifiedReceipt } from "@/modules/verify/receipt-manager";
export {
  getReceiptsForOperation,
  getReceiptsForModule,
  verifyReceiptChain,
  exportAuditTrail,
  getRecentReceipts,
  getRecentDerivations,
  getRecentCertificates,
} from "@/modules/verify/audit-trail";
export type { AuditDerivation, AuditCertificate } from "@/modules/verify/audit-trail";
export { systemIntegrityCheck } from "@/modules/verify/integrity-check";
export type { CheckResult, IntegrityReport } from "@/modules/verify/integrity-check";
export { default as AuditPage } from "@/modules/verify/pages/AuditPage";

// ── Epistemic Grading (from epistemic/) ────────────────────────────────────
export {
  gradeInfo,
  gradeToLabel,
  gradeToStyles,
  computeGrade,
  ALL_GRADES,
} from "@/modules/epistemic/grading";
export type { GradeInfo } from "@/modules/epistemic/grading";
export { upgradeToA, upgradeToB } from "@/modules/epistemic/upgrader";
export type { UpgradeResult } from "@/modules/epistemic/upgrader";
export { EpistemicBadge, EpistemicGradeLegend } from "@/modules/epistemic/components/EpistemicBadge";
export {
  GRADE_DEFINITIONS,
  assignGrade,
  graded,
  deriveGradeA,
} from "@/modules/epistemic/grade-engine";
export type { Graded } from "@/modules/epistemic/grade-engine";

// ── Shape Validation (from shacl/) ─────────────────────────────────────────
export {
  DatumShape,
  DerivationShape,
  CertificateShape,
  PartitionShape,
  SHAPES,
  SHAPE_IDS,
} from "@/modules/shacl/shapes";
export type { Violation, ShapeResult } from "@/modules/shacl/shapes";
export { validate, validateOnWrite } from "@/modules/shacl/validator";
export type { ValidationReport } from "@/modules/shacl/validator";
export { runConformanceSuite } from "@/modules/shacl/conformance";
export type { ConformanceTest, ConformanceSuiteResult } from "@/modules/shacl/conformance-types";
export type { ConformanceResult, ConformanceGroup } from "@/modules/shacl/conformance-types";
export { CANONICAL_PARTITION } from "@/modules/shacl/conformance-partition";
export { validateShaclShapes, validateShape, shaclGuard, ALL_SHAPE_NAMES } from "@/modules/shacl/shacl-engine";
export type { ShaclViolation, ShaclResult, ShaclShapeName } from "@/modules/shacl/shacl-engine";
export { default as ConformancePage } from "@/modules/shacl/pages/ConformancePage";
