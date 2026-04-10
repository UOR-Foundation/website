/**
 * ContainerInspector — Runtime metadata panel (docker inspect).
 * ═════════════════════════════════════════════════════════════════
 *
 * A status pill always visible after boot, plus a 3-tab inspector
 * panel: Overview · Packages · Graph.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useDesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";
import type { BootReceipt } from "./ContainerBootOverlay";

// Module-level cache for orchestrator import — avoids re-resolution on every 2s tick
let _orchestratorModule: any = null;
async function getOrchestrator() {
  if (!_orchestratorModule) {
    _orchestratorModule = await import("@/modules/platform/compose/orchestrator");
  }
  return _orchestratorModule;
}

interface Props {
  appId: string;
  receipt: BootReceipt;
}

type Tab = "overview" | "packages" | "graph";

interface LiveMetrics {
  callCount: number;
  deniedCount: number;
  payloadBytes: number;
  state: string;
  uptime: number;
}

// ── Status Pill ───────────────────────────────────────────────────────────

export function ContainerStatusPill({
  appId,
  receipt,
  onClick,
}: Props & { onClick: () => void }) {
  const { theme } = useDesktopTheme();
  const isDark = theme !== "light";
  const nsCount = receipt.kernelNamespaces?.length ?? 0;
  const opCount = receipt.kernelOps?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-2 left-2 z-30 flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide cursor-pointer transition-all duration-200 hover:opacity-100 hover:scale-105"
      style={{
        opacity: 0.7,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
        color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        fontFamily: "'DM Sans', monospace",
        backdropFilter: "blur(8px)",
      }}
      title="Container Inspector · docker inspect"
    >
      <span style={{ color: "#4ade80", fontSize: 7 }}>●</span>
      <span className="font-semibold">{appId}</span>
      <span style={{ opacity: 0.4 }}>running</span>
      <span style={{ opacity: 0.3 }}>·</span>
      <span style={{ opacity: 0.5 }}>{nsCount}ns · {opCount}ops</span>
    </button>
  );
}

// ── Row Helper ────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  fg,
  fgDim,
}: {
  label: string;
  value: string;
  fg: string;
  fgDim: string;
}) {
  return (
    <div className="flex justify-between text-[11px] py-[2px]">
      <span style={{ color: fgDim }}>{label}</span>
      <span style={{ color: fg, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────

function SectionHeader({ label, fgDim }: { label: string; fgDim: string }) {
  return (
    <div
      className="text-[9px] font-semibold uppercase tracking-widest mb-1 mt-2"
      style={{ color: fgDim }}
    >
      {label}
    </div>
  );
}

// ── Inspector Panel ───────────────────────────────────────────────────────

export default function ContainerInspector({ appId, receipt }: Props) {
  const { theme } = useDesktopTheme();
  const isDark = theme !== "light";
  const [tab, setTab] = useState<Tab>("overview");
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [expandedNs, setExpandedNs] = useState<Set<string>>(new Set());

  const fetchMetrics = useCallback(async () => {
    try {
      const mod = await getOrchestrator();
      const kernel = mod.orchestrator.getKernel(appId);
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

  const bg = isDark ? "rgba(10,10,14,0.97)" : "rgba(255,255,255,0.97)";
  const fg = isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)";
  const fgDim = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const green = "#4ade80";

  const formatBytes = (b: number) =>
    b < 1024 ? `${b}B` : `${(b / 1024).toFixed(1)}KB`;
  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "packages", label: "Packages" },
    { id: "graph", label: "Graph" },
  ];

  const toggleNs = (ns: string) => {
    setExpandedNs(prev => {
      const next = new Set(prev);
      next.has(ns) ? next.delete(ns) : next.add(ns);
      return next;
    });
  };

  return (
    <div
      className="absolute bottom-10 left-2 z-40 w-[300px] rounded-lg overflow-hidden animate-scale-in container-inspector-panel"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: isDark
          ? "0 12px 40px rgba(0,0,0,0.7)"
          : "0 12px 40px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-3 py-2"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <span style={{ color: green, fontSize: 7 }}>●</span>
        <span className="text-[11px] font-semibold" style={{ color: fg }}>
          docker inspect
        </span>
        <span className="text-[10px]" style={{ color: fgDim }}>
          {appId}
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex px-2 pt-1.5"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-2 pb-1.5 text-[10px] font-medium tracking-wide transition-colors"
            style={{
              color: tab === t.id ? fg : fgDim,
              borderBottom: tab === t.id ? `2px solid ${green}` : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-3 py-2 max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {tab === "overview" && (
          <>
            <SectionHeader label="Container" fgDim={fgDim} />
            <Row label="ID" value={receipt.containerId?.slice(0, 16) ?? "—"} fg={fg} fgDim={fgDim} />
            <Row label="Image" value={`bp:${appId}:latest`} fg={fg} fgDim={fgDim} />
            <Row label="State" value={metrics?.state ?? "running"} fg={fg} fgDim={fgDim} />
            <Row label="Uptime" value={metrics ? formatUptime(metrics.uptime) : "—"} fg={fg} fgDim={fgDim} />

            <SectionHeader label="Resources" fgDim={fgDim} />
            <Row label="Syscalls" value={String(metrics?.callCount ?? 0)} fg={fg} fgDim={fgDim} />
            <Row label="Denied" value={String(metrics?.deniedCount ?? 0)} fg={fg} fgDim={fgDim} />
            <Row label="I/O" value={metrics ? formatBytes(metrics.payloadBytes) : "0B"} fg={fg} fgDim={fgDim} />

            <SectionHeader label="Attestation" fgDim={fgDim} />
            <Row label="Digest" value={receipt.sealHash ? `sha256:${receipt.sealHash.slice(0, 16)}` : "—"} fg={fg} fgDim={fgDim} />
            <Row label="Boot" value={`${receipt.totalMs.toFixed(0)}ms`} fg={fg} fgDim={fgDim} />
          </>
        )}

        {tab === "packages" && (
          <>
            <SectionHeader label={`Namespaces (${receipt.kernelNamespaces?.length ?? 0})`} fgDim={fgDim} />
            {(receipt.kernelNamespaces ?? []).length === 0 && (
              <div className="text-[10px] py-1" style={{ color: fgDim }}>
                No namespaces registered
              </div>
            )}
            {(receipt.kernelNamespaces ?? []).map(ns => {
              const nsOps = (receipt.kernelOps ?? []).filter(op =>
                op.startsWith(ns + "/"),
              );
              const isOpen = expandedNs.has(ns);
              return (
                <div key={ns}>
                  <button
                    onClick={() => toggleNs(ns)}
                    className="flex items-center gap-1.5 w-full text-left text-[11px] py-1 hover:opacity-80 transition-opacity"
                    style={{ color: fg }}
                  >
                    <span
                      className="text-[8px] transition-transform duration-150"
                      style={{
                        display: "inline-block",
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        color: fgDim,
                      }}
                    >
                      ▶
                    </span>
                    <span className="font-semibold">{ns}/</span>
                    <span style={{ color: fgDim, fontSize: 10 }}>
                      {nsOps.length} ops
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pl-5 space-y-0.5 mb-1">
                      {nsOps.map(op => (
                        <div
                          key={op}
                          className="text-[10px]"
                          style={{ color: fgDim, fontFamily: "monospace" }}
                        >
                          {op.split("/")[1]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <SectionHeader label="Permissions" fgDim={fgDim} />
            <Row label="Total Ops" value={String(receipt.kernelOps?.length ?? 0)} fg={fg} fgDim={fgDim} />
            <Row label="Namespaces" value={String(receipt.kernelNamespaces?.length ?? 0)} fg={fg} fgDim={fgDim} />
          </>
        )}

        {tab === "graph" && (
          <>
            <SectionHeader label="Namespace Graph" fgDim={fgDim} />
            <div className="space-y-0.5">
              {(receipt.kernelNamespaces ?? []).map((ns, i, arr) => {
                const nsOps = (receipt.kernelOps ?? []).filter(op =>
                  op.startsWith(ns + "/"),
                );
                const isLast = i === arr.length - 1;
                return (
                  <div key={ns}>
                    <div
                      className="text-[11px] font-semibold flex items-center gap-1"
                      style={{ color: fg, fontFamily: "monospace" }}
                    >
                      <span style={{ color: fgDim }}>{isLast ? "└─" : "├─"}</span>
                      <span>{ns}/</span>
                      <span style={{ color: green, fontSize: 9, fontWeight: 400 }}>
                        {nsOps.length}
                      </span>
                    </div>
                    {nsOps.map((op, j) => (
                      <div
                        key={op}
                        className="text-[10px] pl-4"
                        style={{ color: fgDim, fontFamily: "monospace" }}
                      >
                        {isLast ? "  " : "│ "}
                        {j === nsOps.length - 1 ? "└─" : "├─"} {op.split("/")[1]}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {(!receipt.kernelNamespaces ||
              receipt.kernelNamespaces.length === 0) && (
              <div className="text-[10px] py-2" style={{ color: fgDim }}>
                No namespace graph available
              </div>
            )}

            <SectionHeader label="Summary" fgDim={fgDim} />
            <Row label="Nodes" value={String(receipt.kernelNamespaces?.length ?? 0)} fg={fg} fgDim={fgDim} />
            <Row label="Edges" value={String(receipt.kernelOps?.length ?? 0)} fg={fg} fgDim={fgDim} />
          </>
        )}
      </div>
    </div>
  );
}
