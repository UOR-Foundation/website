/**
 * StatCard — Stat widget for metrics display.
 */

import type { ReactNode } from "react";
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  trend?: number;
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
    <div className="bg-card rounded-xl transition-shadow hover:shadow-md"
      style={{ padding: "var(--holo-space-4)", display: "flex", flexDirection: "column", gap: "var(--holo-space-2)" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground uppercase" style={{ fontSize: "var(--holo-text-xs)", letterSpacing: "0.08em" }}>
          {label}
        </span>
        {icon && <span className="text-muted-foreground opacity-60">{icon}</span>}
      </div>
      <div
        className="font-bold tracking-tight font-mono"
        style={{ fontSize: "var(--holo-text-2xl)", ...(accentVar ? { color: `hsl(var(--${accentVar}))` } : {}) }}
      >
        {value}
      </div>
      {(trend !== undefined || sublabel) && (
        <div className="flex items-center" style={{ gap: "var(--holo-space-2)", fontSize: "var(--holo-text-xs)" }}>
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
