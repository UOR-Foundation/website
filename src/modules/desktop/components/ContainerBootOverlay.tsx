/**
 * ContainerBootOverlay — Standardized application boot sequence.
 * ═════════════════════════════════════════════════════════════════
 *
 * Every application must pass through this overlay before becoming
 * interactive. Runs the real Orchestrator → Kernel → Container
 * pipeline and visualises each phase in a compact terminal log.
 *
 * Phase 1: INIT       → orchestrator.ensureRunning(appName)
 * Phase 2: CONTAINER  → Reads container ID + state
 * Phase 3: KERNEL     → Reads permissions, namespaces, ops
 * Phase 4: MOUNT      → Component lazy-load complete
 * Phase 5: SEAL       → kernel.seal() → content-addressed hash
 * Phase 6: READY      → Overlay fades, app is interactive
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

// ── Types ─────────────────────────────────────────────────────────────────

export interface BootPhase {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "running" | "done" | "error";
  durationMs?: number;
}

export interface BootReceipt {
  appId: string;
  instanceId?: string;
  containerId?: string;
  sealHash?: string;
  phases: BootPhase[];
  totalMs: number;
  kernelOps?: string[];
  kernelNamespaces?: string[];
}

interface Props {
  appId: string;
  appLabel: string;
  onReady: (receipt: BootReceipt) => void;
}

// ── Phase Runner ──────────────────────────────────────────────────────────

async function runPhase(
  phase: BootPhase,
  fn: () => Promise<string>,
): Promise<BootPhase> {
  const t0 = performance.now();
  try {
    const detail = await fn();
    return { ...phase, status: "done", detail, durationMs: performance.now() - t0 };
  } catch (err: any) {
    return {
      ...phase,
      status: "error",
      detail: err?.message?.slice(0, 60) ?? "failed",
      durationMs: performance.now() - t0,
    };
  }
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ContainerBootOverlay({ appId, appLabel, onReady }: Props) {
  const { theme } = useDesktopTheme();
  const [phases, setPhases] = useState<BootPhase[]>([
    { id: "init", label: "INIT", detail: "orchestrator", status: "pending" },
    { id: "container", label: "CONTAINER", detail: "creating", status: "pending" },
    { id: "kernel", label: "KERNEL", detail: "permissions", status: "pending" },
    { id: "mount", label: "MOUNT", detail: "component", status: "pending" },
    { id: "seal", label: "SEAL", detail: "hashing", status: "pending" },
    { id: "ready", label: "READY", detail: "interactive", status: "pending" },
  ]);
  const [fading, setFading] = useState(false);
  const didRun = useRef(false);

  const updatePhase = useCallback((id: string, update: Partial<BootPhase>) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, ...update } : p));
  }, []);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const t0 = performance.now();
    let instanceId: string | undefined;
    let containerId: string | undefined;
    let sealHash: string | undefined;
    let kernelOps: string[] = [];
    let kernelNamespaces: string[] = [];

    (async () => {
      // Phase 1: INIT — ensureRunning
      updatePhase("init", { status: "running" });
      const p1 = await runPhase(phases[0], async () => {
        const { orchestrator } = await import("@/modules/compose/orchestrator");
        const kernel = orchestrator.ensureRunning(appId);
        if (kernel) {
          instanceId = kernel.instanceId;
          return `${kernel.instanceId}`;
        }
        return "no blueprint";
      });
      updatePhase("init", p1);

      // Phase 2: CONTAINER — read container state
      updatePhase("container", { status: "running" });
      const p2 = await runPhase(phases[1], async () => {
        if (instanceId) {
          const { getContainer } = await import("@/modules/uns/build/container");
          const c = getContainer(instanceId);
          if (c) {
            containerId = c.id;
            return `uor:${c.id.slice(0, 12)}`;
          }
        }
        containerId = `${appId}-ct`;
        return `uor:${appId}`;
      });
      updatePhase("container", p2);

      // Phase 3: KERNEL — permissions & namespaces
      updatePhase("kernel", { status: "running" });
      const p3 = await runPhase(phases[2], async () => {
        if (instanceId) {
          const { orchestrator } = await import("@/modules/compose/orchestrator");
          const kernel = orchestrator.getKernel(appId);
          if (kernel) {
            kernelOps = kernel.allowedOperations();
            const nsSet = new Set(kernelOps.map(op => op.split("/")[0]));
            kernelNamespaces = Array.from(nsSet);
            return `${kernelNamespaces.length} ns · ${kernelOps.length} ops`;
          }
        }
        return "standalone";
      });
      updatePhase("kernel", p3);

      // Phase 4: MOUNT — component ready (simulates lazy load time)
      updatePhase("mount", { status: "running" });
      const p4 = await runPhase(phases[3], async () => {
        return appLabel;
      });
      updatePhase("mount", p4);

      // Phase 5: SEAL — content-addressed runtime hash
      updatePhase("seal", { status: "running" });
      const p5 = await runPhase(phases[4], async () => {
        if (instanceId) {
          const { orchestrator } = await import("@/modules/compose/orchestrator");
          const kernel = orchestrator.getKernel(appId);
          if (kernel) {
            sealHash = await kernel.seal();
            return sealHash.slice(0, 16) + "…";
          }
        }
        // Fallback: hash the appId
        const { singleProofHash } = await import("@/lib/uor-canonical");
        const proof = await singleProofHash({ app: appId, t: Date.now() });
        sealHash = proof.cid;
        return proof.cid.slice(0, 16) + "…";
      });
      updatePhase("seal", p5);

      // Phase 6: READY
      updatePhase("ready", { status: "done", detail: "interactive", durationMs: 0 });

      const totalMs = performance.now() - t0;
      const finalPhases = [p1, p2, p3, p4, p5, { ...phases[5], status: "done" as const, durationMs: 0 }];

      // Brief pause so user sees the completed state
      await new Promise(r => setTimeout(r, 150));

      setFading(true);
      setTimeout(() => {
        onReady({
          appId,
          instanceId,
          containerId,
          sealHash,
          phases: finalPhases,
          totalMs,
          kernelOps,
          kernelNamespaces,
        });
      }, 300);
    })();
  }, [appId, appLabel, onReady, updatePhase]);

  const isDark = theme !== "light";
  const bg = isDark ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.95)";
  const fg = isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)";
  const fgDim = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const green = isDark ? "#4ade80" : "#16a34a";
  const amber = isDark ? "#fbbf24" : "#d97706";
  const red = "#ef4444";

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: bg,
        fontFamily: "'DM Sans', ui-monospace, monospace",
        transition: "opacity 300ms ease-out",
        opacity: fading ? 0 : 1,
      }}
    >
      {/* Header */}
      <div className="mb-4 text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: fgDim }}>
        Booting
      </div>
      <div className="mb-6 text-sm font-bold tracking-wider" style={{ color: fg }}>
        {appLabel}
      </div>

      {/* Phase list */}
      <div className="w-[320px] space-y-1">
        {phases.map(phase => {
          const icon =
            phase.status === "done" ? "✓" :
            phase.status === "running" ? "●" :
            phase.status === "error" ? "✗" : "○";
          const iconColor =
            phase.status === "done" ? green :
            phase.status === "running" ? amber :
            phase.status === "error" ? red : fgDim;

          return (
            <div key={phase.id} className="flex items-center gap-3 text-xs" style={{ color: fg }}>
              <span style={{ color: iconColor, width: 12, textAlign: "center", fontFamily: "monospace" }}>
                {icon}
              </span>
              <span className="w-[80px] font-semibold tracking-wider uppercase" style={{ fontSize: 10, color: fgDim }}>
                {phase.label}
              </span>
              <span className="flex-1 truncate" style={{ color: phase.status === "pending" ? fgDim : fg }}>
                {phase.detail}
              </span>
              {phase.durationMs !== undefined && (
                <span style={{ color: fgDim, fontSize: 10, fontFamily: "monospace" }}>
                  {phase.durationMs.toFixed(0)}ms
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
