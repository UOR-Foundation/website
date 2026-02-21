/**
 * EpistemicBadge — reusable grade display component.
 *
 * Shows the grade letter with color coding and an optional tooltip.
 * This is the SINGLE SOURCE OF TRUTH for grade display across the entire UI.
 *
 * Usage:
 *   <EpistemicBadge grade="A" />
 *   <EpistemicBadge grade="B" showLabel />
 *   <EpistemicBadge grade="C" size="lg" />
 */

import type { EpistemicGrade } from "@/types/uor";
import { gradeInfo, gradeToStyles } from "../grading";

interface EpistemicBadgeProps {
  grade: EpistemicGrade;
  /** Show the label text next to the grade letter. */
  showLabel?: boolean;
  /** Size variant. */
  size?: "sm" | "md" | "lg";
  /** Show tooltip on hover with full description. */
  showTooltip?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-5 h-5 text-[8px]",
  md: "w-6 h-6 text-[10px]",
  lg: "w-7 h-7 text-[11px]",
};

export function EpistemicBadge({
  grade,
  showLabel = false,
  size = "md",
  showTooltip = true,
}: EpistemicBadgeProps) {
  const info = gradeInfo(grade);

  const badge = (
    <span
      className={`inline-flex items-center justify-center rounded border font-bold flex-shrink-0 ${SIZE_CLASSES[size]} ${gradeToStyles(grade)}`}
      title={showTooltip ? `${info.label}: ${info.description}` : undefined}
    >
      {grade}
    </span>
  );

  if (!showLabel) return badge;

  return (
    <span className="inline-flex items-center gap-1.5">
      {badge}
      <span className={`text-xs ${info.colorClass}`}>{info.label}</span>
    </span>
  );
}

/**
 * EpistemicGradeLegend — shows all four grades with labels.
 * Reusable footer for any page displaying graded data.
 */
export function EpistemicGradeLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
      <span className="font-medium">Grade key:</span>
      <EpistemicBadge grade="A" showLabel />
      <EpistemicBadge grade="B" showLabel />
      <EpistemicBadge grade="C" showLabel />
      <EpistemicBadge grade="D" showLabel />
    </div>
  );
}
