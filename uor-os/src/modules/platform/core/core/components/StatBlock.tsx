/**
 * StatBlock — Algebrica-style HUD stat: bold value + tiny uppercase label.
 * No cards, no borders — raw numbers that breathe.
 */

interface StatBlockProps {
  value: string | number;
  label: string;
  className?: string;
}

export default function StatBlock({ value, label, className = "" }: StatBlockProps) {
  return (
    <div className={`flex items-baseline gap-1.5 ${className}`}>
      <span className="text-sm font-bold text-zinc-200 tabular-nums">{value}</span>
      <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">
        {label}
      </span>
    </div>
  );
}
