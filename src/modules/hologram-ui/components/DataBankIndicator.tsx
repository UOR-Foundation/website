/**
 * DataBankIndicator — Ambient sync status for the Data Bank Box
 * ══════════════════════════════════════════════════════════════
 *
 * Shows a shield icon with a subtle dot indicating sync health.
 * Hover/click reveals a compact popover with slot count,
 * pending writes, and encryption status.
 *
 * @module hologram-ui/components/DataBankIndicator
 */

import { useState, useEffect, useRef } from "react";
import { DatabaseZap, Check, Loader2, AlertTriangle } from "lucide-react";
import { useDataBank } from "@/modules/data-bank";

type HealthState = "synced" | "syncing" | "pending" | "offline";

function resolveHealth(syncing: boolean, authenticated: boolean, pendingWrites: number): HealthState {
  if (!authenticated) return "offline";
  if (syncing) return "syncing";
  if (pendingWrites > 0) return "pending";
  return "synced";
}

const HEALTH_DOT: Record<HealthState, string> = {
  synced: "hsl(152, 50%, 50%)",
  syncing: "hsl(45, 70%, 55%)",
  pending: "hsl(30, 80%, 55%)",
  offline: "hsl(0, 0%, 45%)",
};

const HEALTH_LABEL: Record<HealthState, string> = {
  synced: "Synced",
  syncing: "Syncing…",
  pending: "Pending",
  offline: "Local only",
};

interface DataBankIndicatorProps {
  expanded: boolean;
  bgMode?: "image" | "white" | "dark";
}

export default function DataBankIndicator({ expanded, bgMode = "image" }: DataBankIndicatorProps) {
  const { authenticated, syncing, status, sync } = useDataBank();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const health = resolveHealth(syncing, authenticated, status.pendingWrites);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopoverOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  const isLight = bgMode === "white";
  const textColor = isLight ? "hsl(0, 0%, 15%)" : "hsl(38, 10%, 88%)";
  const mutedColor = isLight ? "hsl(0, 0%, 45%)" : "hsl(38, 8%, 60%)";
  const surfaceBg = isLight ? "hsl(0, 0%, 97%)" : "hsl(25, 10%, 14%)";
  const borderColor = isLight ? "hsla(0, 0%, 0%, 0.1)" : "hsla(38, 12%, 70%, 0.15)";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        className={`sidebar-nav-btn w-full flex items-center gap-3 rounded-xl transition-colors duration-200 ${
          !expanded ? "justify-center px-0 py-3" : "px-3.5 py-3"
        }`}
        style={{ color: "var(--sb-text)" }}
        title="Data Bank"
      >
        <div className="relative">
          <DatabaseZap className="w-5 h-5 shrink-0" strokeWidth={1.5} style={{ color: "var(--sb-muted)" }} />
          {/* Health dot */}
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{
              background: HEALTH_DOT[health],
              boxShadow: health === "syncing" ? `0 0 6px ${HEALTH_DOT[health]}` : "none",
              animation: health === "syncing" ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
        </div>
        {expanded && <span className="text-[14px] font-light whitespace-nowrap">Data Bank</span>}
      </button>

      {/* ── Popover ────────────────────────────────────────── */}
      {popoverOpen && (
        <div
          className="absolute left-full bottom-0 ml-3 w-[220px] rounded-xl p-4 z-50"
          style={{
            background: surfaceBg,
            border: `1px solid ${borderColor}`,
            boxShadow: "0 8px 32px -8px hsla(0, 0%, 0%, 0.3)",
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <DatabaseZap className="w-4 h-4" style={{ color: HEALTH_DOT[health] }} />
            <span className="text-[13px] font-medium" style={{ color: textColor }}>
              Data Bank
            </span>
            <span
              className="ml-auto text-[11px] px-1.5 py-0.5 rounded-md"
              style={{
                color: HEALTH_DOT[health],
                background: `${HEALTH_DOT[health]}15`,
              }}
            >
              {HEALTH_LABEL[health]}
            </span>
          </div>

          {/* Stats */}
          <div className="space-y-2">
            <StatRow label="Slots" value={`${status.slotCount}`} muted={mutedColor} text={textColor} />
            <StatRow
              label="Pending"
              value={`${status.pendingWrites}`}
              muted={mutedColor}
              text={status.pendingWrites > 0 ? HEALTH_DOT.pending : textColor}
            />
            <StatRow
              label="Encryption"
              value={authenticated ? "AES-256-GCM" : "—"}
              muted={mutedColor}
              text={authenticated ? "hsl(152, 50%, 50%)" : mutedColor}
            />
            <StatRow
              label="Last sync"
              value={status.lastSyncAt ? timeSince(status.lastSyncAt) : "Never"}
              muted={mutedColor}
              text={textColor}
            />
          </div>

          {/* Actions */}
          {authenticated && (
            <button
              onClick={() => { sync(); setPopoverOpen(false); }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[12px] py-1.5 rounded-lg transition-colors duration-200"
              style={{
                color: mutedColor,
                border: `1px solid ${borderColor}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${borderColor}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}

          {!authenticated && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: mutedColor }}>
              <AlertTriangle className="w-3 h-3" />
              <span>Sign in for multi-device sync</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Stat row ─────────────────────────────────────────────── */
function StatRow({ label, value, muted, text }: { label: string; value: string; muted: string; text: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px]" style={{ color: muted }}>{label}</span>
      <span className="text-[11px] font-mono" style={{ color: text }}>{value}</span>
    </div>
  );
}

/* ── Time since helper ────────────────────────────────────── */
function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
