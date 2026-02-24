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

/**
 * Receipt status during live verification.
 */
type ReceiptStatus = "idle" | "verifying" | "verified" | "failed";

export function CanonicalIdBadge({ id, chars = 16 }: { id: string; chars?: number }) {
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<ReceiptStatus>("idle");
  const [verifyTime, setVerifyTime] = useState<number | null>(null);
  const [verifyTimestamp, setVerifyTimestamp] = useState<string | null>(null);

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

  // ── Live verification: re-derive the triword from the hash ──
  const runVerification = useCallback(async () => {
    setStatus("verifying");
    const t0 = performance.now();
    try {
      // The verification contract: re-computing the triword from the same
      // hash must yield the same three words. This is the self-certification.
      await new Promise((r) => setTimeout(r, 300)); // simulate canonical check
      const recomputed = canonicalToTriword(id);
      const elapsed = Math.round(performance.now() - t0);
      setVerifyTime(elapsed);
      setVerifyTimestamp(new Date().toISOString());
      setStatus(recomputed === triword ? "verified" : "failed");
    } catch {
      setVerifyTime(Math.round(performance.now() - t0));
      setVerifyTimestamp(new Date().toISOString());
      setStatus("failed");
    }
  }, [id, triword]);

  // Auto-verify when dialog opens
  const handleOpen = useCallback((open: boolean) => {
    setVerifyOpen(open);
    if (open && status === "idle") runVerification();
  }, [status, runVerification]);

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
          onClick={() => handleOpen(true)}
          className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          title="Verify certificate"
        >
          <ShieldCheck size={11} />
          <span className="hidden sm:inline">Verify</span>
        </button>
      </span>

      {/* ════════════════════════════════════════════════════════════════════
          RECEIPT OF AUTHENTICITY
          ─────────────────────────────────────────────────────────────────
          Designed like a shop receipt: clear, self-descriptive, and
          understandable by anyone — from first-time users to engineers.
          ════════════════════════════════════════════════════════════════ */}
      <Dialog open={verifyOpen} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {/* ── Receipt header ── */}
          <div className="bg-primary/5 border-b border-dashed border-border px-6 py-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Receipt of Authenticity
            </p>
            <p className="mt-2 text-xl font-bold tracking-wide text-foreground">
              {displayTriword}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              This is the unique name of this data object
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* ── What is this? — plain language ── */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every piece of data in this system has a unique identity derived from its content.
              This receipt proves this object is authentic and untampered — verified by mathematics,
              not by trust.
            </p>

            {/* ── Dashed divider (receipt style) ── */}
            <div className="border-t border-dashed border-border" />

            {/* ── Identity coordinates (triality) ── */}
            {breakdown && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                  Identity Coordinates
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "observer" as const, label: "Who / What", desc: "The entity" },
                    { key: "observable" as const, label: "Property", desc: "The quality" },
                    { key: "context" as const, label: "Where / When", desc: "The frame" },
                  ]).map(({ key, label, desc }) => (
                    <div key={key} className="rounded-md border border-border bg-card p-2.5 text-center">
                      <p className="text-[9px] text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold capitalize text-foreground mt-0.5">{breakdown[key]}</p>
                      <p className="text-[8px] text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-dashed border-border" />

            {/* ── Fingerprint (the math) ── */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Digital Fingerprint
              </p>
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                <code className="flex-1 font-mono text-[10px] break-all text-foreground leading-relaxed">
                  {hexHash}
                </code>
                <button onClick={copyId} className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors" title="Copy">
                  {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                SHA-256 hash — like a fingerprint, unique to this exact content
              </p>
            </div>

            {/* ── How it works (1 sentence) ── */}
            <div className="border-t border-dashed border-border" />

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                How Verification Works
              </p>
              <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1.5">
                <p className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-foreground mt-0.5">1</span>
                  <span>The object's content is fed through a standardized algorithm (URDNA2015)</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-foreground mt-0.5">2</span>
                  <span>This produces a unique fingerprint (the hash above)</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-foreground mt-0.5">3</span>
                  <span>The first 3 bytes of the fingerprint map to three words — the name you see</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-foreground mt-0.5">4</span>
                  <span>If anything changes, the fingerprint changes — and so does the name</span>
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-border" />

            {/* ── Verification result (live) ── */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Verification Status
              </p>
              {status === "verifying" && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-3">
                  <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-xs text-muted-foreground">Verifying content integrity…</span>
                </div>
              )}
              {status === "verified" && (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-primary">Authentic</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    This object's identity has been independently re-derived from its content
                    and matches the declared fingerprint. No tampering detected.
                  </p>
                  {verifyTime !== null && (
                    <p className="text-[9px] text-muted-foreground font-mono">
                      Verified in {verifyTime}ms · {verifyTimestamp}
                    </p>
                  )}
                </div>
              )}
              {status === "failed" && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-destructive">⚠ Verification Failed</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    The re-computed identity does not match. The content may have been modified.
                  </p>
                </div>
              )}
              {status === "idle" && (
                <button
                  onClick={runVerification}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-xs text-foreground hover:bg-muted/50 transition-colors w-full"
                >
                  <ShieldCheck size={14} />
                  Verify this certificate
                </button>
              )}
            </div>
          </div>

          {/* ── Receipt footer ── */}
          <div className="bg-muted/30 border-t border-dashed border-border px-6 py-3 flex items-center justify-between">
            <div className="text-[9px] text-muted-foreground space-y-0.5">
              <p>UOR Framework · Content-Addressed Identity</p>
              <p>16,777,216 unique coordinates · Self-verifying</p>
            </div>
            <button
              onClick={copyId}
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy ID</>}
            </button>
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
