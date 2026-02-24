/**
 * MetricBar — Horizontal progress bar for UOR metrics.
 */

export interface MetricBarProps {
  label: string;
  value: number; // 0–1
  /** CSS color string */
  color?: string;
  showPercent?: boolean;
  sublabel?: string;
}

export function MetricBar({
  label, value, color = "hsl(var(--primary))", showPercent = true, sublabel,
}: MetricBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {sublabel && (
            <span className="text-[10px] text-muted-foreground">{sublabel}</span>
          )}
          {showPercent && (
            <span className="text-[10px] font-mono font-medium text-muted-foreground">
              {pct}%
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
