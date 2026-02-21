/**
 * epistemic module barrel export.
 */

export {
  gradeInfo,
  gradeToLabel,
  gradeToStyles,
  computeGrade,
  ALL_GRADES,
} from "./grading";
export type { GradeInfo } from "./grading";

export { upgradeToA, upgradeToB } from "./upgrader";
export type { UpgradeResult } from "./upgrader";

export { EpistemicBadge, EpistemicGradeLegend } from "./components/EpistemicBadge";
