/**
 * UNS Console — Shared UI Components
 *
 * UOR-native UI primitives: canonical IDs are identity, not implementation detail.
 * Triwords are the primary human-facing identifier for all UOR objects.
 */

import { useState, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/modules/core/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/ui/dialog";
import { ShieldCheck, Copy, Check, ExternalLink } from "lucide-react";

// ── CanonicalIdBadge ────────────────────────────────────────────────────────
//
// The primary identity component for all UOR objects throughout the system.
// Shows the triword (Observer · Observable · Context) as the human-readable
// identifier with a "Verify certificate" link that opens full verification.

import {
  canonicalToTriword,
  formatTriword,
  triwordBreakdown,
} from "@/lib/uor-triword";

export function CanonicalIdBadge({ id, chars = 16 }: { id: string; chars?: number }) {
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const triword = canonicalToTriword(id);
  const displayTriword = formatTriword(triword);
  const breakdown = triwordBreakdown(triword);

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [id]);

  // Extract hex for display
  const hexHash = id
    .replace("urn:uor:derivation:sha256:", "")
    .replace("0x", "");

  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 cursor-default">
              <span className="text-xs font-semibold text-foreground tracking-wide">
                {displayTriword}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm space-y-1.5 p-3">
            <p className="font-semibold text-sm">{displayTriword}</p>
            {breakdown && (
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-muted-foreground">Observer</span>
                  <p className="font-medium capitalize">{breakdown.observer}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Observable</span>
                  <p className="font-medium capitalize">{breakdown.observable}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Context</span>
                  <p className="font-medium capitalize">{breakdown.context}</p>
                </div>
              </div>
            )}
            <p className="font-mono text-[10px] break-all text-muted-foreground pt-1 border-t border-border">
              {id}
            </p>
          </TooltipContent>
        </Tooltip>
        <button
          onClick={() => setVerifyOpen(true)}
          className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          title="Verify certificate"
        >
          <ShieldCheck size={11} />
          <span className="hidden sm:inline">Verify</span>
        </button>
      </span>

      {/* ── Certificate Verification Dialog ── */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={18} className="text-primary" />
              Certificate Verification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Triword identity */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <p className="text-lg font-bold tracking-wide text-foreground">
                {displayTriword}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Triword Coordinate — Observer · Observable · Context
              </p>
            </div>

            {/* Triality breakdown */}
            {breakdown && (
              <div className="grid grid-cols-3 gap-3">
                {(["observer", "observable", "context"] as const).map((dim) => (
                  <div key={dim} className="rounded-lg border border-border bg-card p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{dim}</p>
                    <p className="mt-1 font-semibold capitalize text-foreground">{breakdown[dim]}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Full canonical hash */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Canonical Hash (SHA-256)</p>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <code className="flex-1 font-mono text-[11px] break-all text-foreground">
                  {hexHash}
                </code>
                <button onClick={copyId} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" title="Copy full ID">
                  {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Full URN */}
            {id.startsWith("urn:") && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Canonical URN</p>
                <code className="block rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-[11px] break-all text-foreground">
                  {id}
                </code>
              </div>
            )}

            {/* Self-verification proof */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" />
                <p className="text-xs font-semibold text-primary">Self-Verified</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This object's identity is derived from its content via URDNA2015 → SHA-256.
                The triword <span className="font-medium text-foreground">{displayTriword}</span> is
                a deterministic projection of the first 24 bits of the hash into the
                triality-aligned wordlist (16,777,216 unique combinations).
                Re-hashing the object's content will always reproduce this exact identifier.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                UOR Framework — Content-Addressed Identity
              </p>
              <button
                onClick={copyId}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy ID</>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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

// ── ZoneBadge ───────────────────────────────────────────────────────────────

const ZONE_STYLES: Record<string, string> = {
  COHERENCE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  DRIFT: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  COLLAPSE: "bg-destructive/15 text-destructive",
};

export function ZoneBadge({ zone }: { zone: "COHERENCE" | "DRIFT" | "COLLAPSE" }) {
  const style = ZONE_STYLES[zone] ?? ZONE_STYLES.DRIFT;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {zone}
    </span>
  );
}

// ── RevenueCard ─────────────────────────────────────────────────────────────

export function RevenueCard({
  gross,
  net,
  platformFee,
  currency = "USD",
}: {
  gross: number;
  net: number;
  platformFee: number;
  currency?: string;
}) {
  const fmt = (v: number) => `$${v.toFixed(2)}`;
  const splitPct = gross > 0 ? Math.round((net / gross) * 100) : 100;
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Revenue ({currency})</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-foreground">{fmt(net)}</span>
        <span className="text-xs text-muted-foreground">net ({splitPct}% to dev)</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Gross</p>
          <p className="font-mono font-medium text-foreground">{fmt(gross)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Processing Fees</p>
          <p className="font-mono font-medium text-foreground">{fmt(platformFee)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Developer Net</p>
          <p className="font-mono font-medium text-primary">{fmt(net)}</p>
        </div>
      </div>
    </div>
  );
}

// ── ExecutionTraceRow ───────────────────────────────────────────────────────

export function ExecutionTraceRow({ trace }: { trace: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const method = String(trace["trace:method"] ?? "GET");
  const path = String(trace["trace:path"] ?? "/");
  const status = Number(trace["trace:statusCode"] ?? 200);
  const duration = Number(trace["trace:durationMs"] ?? 0);
  const injection = Boolean(trace["trace:injectionDetected"]);
  const density = Number(trace["trace:partitionDensity"] ?? 0);
  const executedAt = String(trace["trace:executedAt"] ?? "");

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
      >
        <span className={`font-mono font-semibold ${status < 400 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {status}
        </span>
        <span className="font-mono text-muted-foreground">{method}</span>
        <span className="font-medium text-foreground flex-1 text-left">{path}</span>
        <span className="font-mono text-muted-foreground">{duration}ms</span>
        <DensityGauge value={density} />
        {injection && (
          <span className="rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-[10px] font-semibold">
            INJECTION
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          {executedAt ? new Date(executedAt).toLocaleTimeString() : ""}
        </span>
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <pre className="max-h-48 overflow-auto bg-muted/50 p-3 text-xs font-mono text-foreground border-t border-border">
          {JSON.stringify(trace, null, 2)}
        </pre>
      )}
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
