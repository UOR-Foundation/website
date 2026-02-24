/**
 * StatCard — Tabler-inspired stat widget for UOR metrics.
 *
 * Displays a single metric with optional trend indicator,
 * sparkline area, and contextual sublabel.
 */

import type { ReactNode } from "react";
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  /** Positive = green up, negative = red down, zero = neutral */
  trend?: number;
  /** Optional color override for the value (HSL var name) */
  accentVar?: string;
}

export function StatCard({
  label, value, sublabel, icon, trend, accentVar,
}: StatCardProps) {
  const trendColor =
    trend === undefined ? undefined
    : trend > 0 ? "hsl(152, 44%, 50%)"
    : trend < 0 ? "hsl(0, 70%, 55%)"
    : "hsl(var(--muted-foreground))";

  const TrendIcon =
    trend === undefined ? null
    : trend > 0 ? IconTrendingUp
    : trend < 0 ? IconTrendingDown
    : IconMinus;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-muted-foreground opacity-60">{icon}</span>}
      </div>

      {/* Value */}
      <div
        className="text-2xl font-bold tracking-tight font-mono"
        style={accentVar ? { color: `hsl(var(--${accentVar}))` } : undefined}
      >
        {value}
      </div>

      {/* Trend + sublabel */}
      {(trend !== undefined || sublabel) && (
        <div className="flex items-center gap-2 text-[10px]">
          {trend !== undefined && TrendIcon && (
            <span className="flex items-center gap-0.5 font-mono font-medium" style={{ color: trendColor }}>
              <TrendIcon size={12} />
              {Math.abs(trend)}%
            </span>
          )}
          {sublabel && (
            <span className="text-muted-foreground">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
