/**
 * ContainerInspector — On-demand container/kernel introspection.
 * ═════════════════════════════════════════════════════════════════
 *
 * Triggered by a status pill in the window corner after boot.
 * Mirrors `docker inspect` / `kubectl describe pod`.
 *
 * Two views: list (conventional table) and graph (namespace tree).
 */

import { useState, useEffect, useCallback } from "react";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import type { BootReceipt } from "./ContainerBootOverlay";

interface Props {
  appId: string;
  receipt: BootReceipt;
}

type ViewMode = "list" | "graph";

interface LiveMetrics {
  callCount: number;
  deniedCount: number;
  payloadBytes: number;
  state: string;
  uptime: number;
}

// ── Status Pill ───────────────────────────────────────────────────────────

export function ContainerStatusPill({ appId, receipt, onClick }: Props & { onClick: () => void }) {
  const { theme } = useDesktopTheme();
  const isDark = theme !== "light";
  const nsCount = receipt.kernelNamespaces?.length ?? 0;
  const opCount = receipt.kernelOps?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-2 left-2 z-30 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide cursor-pointer transition-opacity hover:opacity-100"
      style={{
        opacity: 0.5,
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        fontFamily: "'DM Sans', monospace",
      }}
      title="Container Inspector"
    >
      <span style={{ color: "#4ade80", fontSize: 8 }}>●</span>
      <span>{appId}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{opCount} ops · {nsCount} ns</span>
    </button>
  );
}

// ── Inspector Panel ───────────────────────────────────────────────────────

export default function ContainerInspector({ appId, receipt }: Props) {
  const { theme } = useDesktopTheme();
  const isDark = theme !== "light";
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const { orchestrator } = await import("@/modules/compose/orchestrator");
      const kernel = orchestrator.getKernel(appId);
      if (kernel) {
        const inst = kernel.toInstance();
        setMetrics({
          callCount: inst.callCount,
          deniedCount: inst.deniedCount,
          payloadBytes: inst.payloadBytes,
          state: inst.state,
          uptime: Date.now() - inst.createdAt,
        });
      }
    } catch {}
  }, [appId]);

  useEffect(() => {
    fetchMetrics();
    const timer = setInterval(fetchMetrics, 2000);
    return () => clearInterval(timer);
  }, [fetchMetrics]);

  const bg = isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.97)";
  const fg = isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)";
  const fgDim = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const green = "#4ade80";

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between text-[11px] py-0.5">
      <span style={{ color: fgDim }}>{label}</span>
      <span style={{ color: fg, fontFamily: "monospace" }}>{value}</span>
    </div>
  );

  const formatBytes = (b: number) => b < 1024 ? `${b}B` : `${(b/1024).toFixed(1)}KB`;
  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;
  };

  return (
    <div
      className="absolute bottom-8 left-2 z-40 w-[280px] rounded-lg p-3 space-y-3"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.6)"
          : "0 8px 32px rgba(0,0,0,0.12)",
      }}
    >
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: green, fontSize: 8 }}>●</span>
          <span className="text-xs font-semibold" style={{ color: fg }}>Container Inspector</span>
        </div>
        <div className="flex gap-0.5">
          {(["list", "graph"] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded"
              style={{
                background: viewMode === m ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)") : "transparent",
                color: viewMode === m ? fg : fgDim,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${border}` }} />

      {viewMode === "list" ? (
        <>
          {/* Container section */}
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: fgDim }}>
              Container
            </div>
            <Row label="ID" value={receipt.containerId?.slice(0, 16) ?? "—"} />
            <Row label="State" value={metrics?.state ?? "running"} />
            <Row label="Image" value={`bp:${appId}`} />
            <Row label="Uptime" value={metrics ? formatUptime(metrics.uptime) : "—"} />
          </div>

          {/* Kernel section */}
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: fgDim }}>
              Kernel
            </div>
            <Row label="Namespaces" value={String(receipt.kernelNamespaces?.length ?? 0)} />
            <Row label="Allowed Ops" value={String(receipt.kernelOps?.length ?? 0)} />
            <Row label="Calls" value={String(metrics?.callCount ?? 0)} />
            <Row label="Denied" value={String(metrics?.deniedCount ?? 0)} />
            <Row label="Payload" value={metrics ? formatBytes(metrics.payloadBytes) : "0B"} />
          </div>

          {/* Seal section */}
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: fgDim }}>
              Seal
            </div>
            <Row label="Hash" value={receipt.sealHash?.slice(0, 20) ?? "—"} />
            <Row label="Boot" value={`${receipt.totalMs.toFixed(0)}ms`} />
          </div>
        </>
      ) : (
        /* Graph view — namespace → operation tree */
        <div className="space-y-1.5">
          <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: fgDim }}>
            Namespace Graph
          </div>
          {(receipt.kernelNamespaces ?? []).map(ns => {
            const nsOps = (receipt.kernelOps ?? []).filter(op => op.startsWith(ns + "/"));
            return (
              <div key={ns}>
                <div className="text-[11px] font-semibold" style={{ color: fg }}>
                  ├─ {ns}/
                </div>
                {nsOps.map((op, i) => (
                  <div
                    key={op}
                    className="text-[10px] pl-5"
                    style={{ color: fgDim, fontFamily: "monospace" }}
                  >
                    {i === nsOps.length - 1 ? "└─" : "├─"} {op.split("/")[1]}
                  </div>
                ))}
              </div>
            );
          })}
          {(!receipt.kernelNamespaces || receipt.kernelNamespaces.length === 0) && (
            <div className="text-[10px]" style={{ color: fgDim }}>No namespaces registered</div>
          )}
        </div>
      )}
    </div>
  );
}
