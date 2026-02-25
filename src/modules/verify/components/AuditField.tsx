/** Reusable label+value field for audit detail views. */
export function AuditField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-mono text-xs text-foreground break-all">{value}</p>
    </div>
  );
}
