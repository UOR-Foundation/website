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
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--holo-space-1)" }}>
        <span className="font-medium text-foreground" style={{ fontSize: "var(--holo-text-xs)" }}>{label}</span>
        <div className="flex items-center" style={{ gap: "var(--holo-space-2)" }}>
          {sublabel && (
            <span className="text-muted-foreground" style={{ fontSize: "var(--holo-text-xs)" }}>{sublabel}</span>
          )}
          {showPercent && (
            <span className="font-mono font-medium text-muted-foreground" style={{ fontSize: "var(--holo-text-xs)" }}>
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
