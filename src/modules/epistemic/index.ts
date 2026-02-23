/**
 * epistemic module barrel export.
 */

// ── Existing grading system (UI-focused) ────────────────────────────────────
export {
  gradeInfo,
  gradeToLabel,
  gradeToStyles,
  computeGrade,
  ALL_GRADES,
} from "./grading";
export type { GradeInfo } from "./grading";

// ── Upgrader ────────────────────────────────────────────────────────────────
export { upgradeToA, upgradeToB } from "./upgrader";
export type { UpgradeResult } from "./upgrader";

// ── UI Components ───────────────────────────────────────────────────────────
export { EpistemicBadge, EpistemicGradeLegend } from "./components/EpistemicBadge";

// ── Grade Engine (P22 — first-class trust primitive) ────────────────────────
export {
  GRADE_DEFINITIONS,
  assignGrade,
  graded,
  deriveGradeA,
} from "./grade-engine";
export type { Graded } from "./grade-engine";
