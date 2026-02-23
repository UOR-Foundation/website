/**
 * UNS Console — Shared UI Components
 *
 * UOR-native UI primitives: canonical IDs are identity, not implementation detail.
 */

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/modules/core/ui/tooltip";

// ── CanonicalIdBadge ────────────────────────────────────────────────────────

export function CanonicalIdBadge({ id, chars = 16 }: { id: string; chars?: number }) {
  const short = id.length > chars ? id.slice(0, chars) + "…" : id;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <code className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground cursor-default select-all">
          {short}
        </code>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm break-all font-mono text-xs">
        {id}
      </TooltipContent>
    </Tooltip>
  );
}

// ── IPv6Badge ───────────────────────────────────────────────────────────────

export function IPv6Badge({ address }: { address: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <code className="inline-block rounded bg-accent/10 px-1.5 py-0.5 font-mono text-xs text-accent cursor-default">
          {address}
        </code>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <p className="font-semibold">⚠ Loss Warning</p>
        <p>IPv6 is a routing projection only — 80 bits of 256. Use canonical ID for authoritative verification.</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  challenge: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  block: "bg-destructive/15 text-destructive",
  expired: "bg-muted text-muted-foreground",
  error: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.warn;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ── MorphismBadge ───────────────────────────────────────────────────────────

const MORPHISM_STYLES: Record<string, string> = {
  "morphism:Transform": "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "morphism:Isometry": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "morphism:Embedding": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "morphism:Action": "bg-orange-500/15 text-orange-700 dark:text-orange-400",
};

export function MorphismBadge({ type }: { type: string }) {
  const label = type.replace("morphism:", "");
  const style = MORPHISM_STYLES[type] || MORPHISM_STYLES["morphism:Transform"];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

// ── DensityGauge ────────────────────────────────────────────────────────────

export function DensityGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "bg-emerald-500" : value >= 0.4 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{value.toFixed(3)}</span>
    </div>
  );
}

// ── CoherenceProofPanel ─────────────────────────────────────────────────────

export function CoherenceProofPanel({ proof }: { proof: object }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Coherence Proof</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <pre className="max-h-64 overflow-auto border-t border-border bg-muted/50 p-3 text-xs font-mono text-foreground">
          {JSON.stringify(proof, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── StatCard ────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── ConsoleTable ────────────────────────────────────────────────────────────

export function ConsoleTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode }[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-foreground">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground text-xs">No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
