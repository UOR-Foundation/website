/**
 * ContainerBootOverlay — Docker-style terminal boot sequence.
 * ═════════════════════════════════════════════════════════════════
 *
 * Mimics `docker run` output with real orchestrator data.
 * Each phase is timed with a minimum display duration so users
 * can read the log lines as they appear progressively.
 *
 * Phases (Docker equivalents):
 *   1. PULL   → Pulling image bp:{appId}:latest (4 sub-layers)
 *   2. CREATE → Creating container uor:{containerId}
 *   3. ATTACH → Attaching volumes: {N} ns · {M} ops
 *   4. START  → Starting process…
 *   5. SEAL   → Sealing runtime: sha256:{hash}
 *   6. READY  → Container {name} is running
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useDesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";

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

// ── Helpers ───────────────────────────────────────────────────────────────

const MIN_PHASE_MS = 180;

async function timedPhase(fn: () => Promise<string>): Promise<{ detail: string; ms: number }> {
  const t0 = performance.now();
  let detail: string;
  try {
    detail = await fn();
  } catch (e: any) {
    detail = e?.message?.slice(0, 50) ?? "failed";
  }
  const elapsed = performance.now() - t0;
  const remaining = MIN_PHASE_MS - elapsed;
  if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
  return { detail, ms: performance.now() - t0 };
}

// ── Sub-components ────────────────────────────────────────────────────────

function LayerBar({ index, total, done }: { index: number; total: number; done: boolean }) {
  return (
    <div className="flex items-center gap-2 pl-4 text-[11px]" style={{ fontFamily: "'DM Sans', monospace" }}>
      <span style={{ color: "rgba(255,255,255,0.3)" }}>
        {index === total - 1 ? "└─" : "├─"}
      </span>
      <span style={{ color: "rgba(255,255,255,0.5)" }}>
        Layer {index + 1}/{total}:
      </span>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>
        {["base runtime", "kernel permissions", "bus namespaces", "component bundle"][index] ?? "layer"}
      </span>
      <div className="flex-1" />
      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: done ? "100%" : "0%",
            background: "#4ade80",
            transition: "width 120ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

function TermLine({
  text,
  status,
  ms,
  color,
}: {
  text: string;
  status: "pending" | "running" | "done" | "error";
  ms?: number;
  color?: string;
}) {
  if (status === "pending") return null;

  const statusText =
    status === "done" ? "done" :
    status === "running" ? "..." :
    "err!";
  const statusColor =
    status === "done" ? "#4ade80" :
    status === "running" ? "#fbbf24" :
    "#ef4444";

  return (
    <div
      className="flex items-center gap-2 text-[11px] animate-fade-in"
      style={{ fontFamily: "'DM Sans', monospace", animationDuration: "150ms" }}
    >
      <span style={{ color: color ?? "rgba(255,255,255,0.85)" }}>{text}</span>
      <div className="flex-1" />
      <span style={{ color: statusColor, fontWeight: 600 }}>{statusText}</span>
      {ms !== undefined && status === "done" && (
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, minWidth: 36, textAlign: "right" }}>
          {ms.toFixed(0)}ms
        </span>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ContainerBootOverlay({ appId, appLabel, onReady }: Props) {
  const { theme } = useDesktopTheme();
  const isDark = theme !== "light";

  // State: which lines are visible + their data
  const [lines, setLines] = useState<
    Array<{
      id: string;
      text: string;
      status: "pending" | "running" | "done" | "error";
      ms?: number;
      color?: string;
      layers?: boolean[];
    }>
  >([]);
  const [fading, setFading] = useState(false);
  const didRun = useRef(false);

  const addLine = useCallback(
    (line: { id: string; text: string; status: "running" | "done" | "error"; ms?: number; color?: string; layers?: boolean[] }) => {
      setLines(prev => {
        const existing = prev.findIndex(l => l.id === line.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], ...line };
          return next;
        }
        return [...prev, line];
      });
    },
    [],
  );

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const t0 = performance.now();
    let instanceId: string | undefined;
    let containerId: string | undefined;
    let sealHash: string | undefined;
    let kernelOps: string[] = [];
    let kernelNamespaces: string[] = [];
    const phaseResults: BootPhase[] = [];

    (async () => {
      // Command line
      addLine({ id: "cmd", text: `▸ docker run bp:${appId}`, status: "done", color: "#4ade80" });
      await new Promise(r => setTimeout(r, 200));

      // ── Phase 1: PULL ──────────────────────────────────────
      addLine({ id: "pull", text: `Pulling image bp:${appId}:latest...`, status: "running", layers: [false, false, false, false] });

      const pull = await timedPhase(async () => {
        const { orchestrator } = await import("@/modules/platform/compose/orchestrator");
        const kernel = orchestrator.ensureRunning(appId);
        if (kernel) {
          instanceId = kernel.instanceId;
        }
        return instanceId ?? "no blueprint";
      });

      // Animate layers sequentially
      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 80));
        addLine({
          id: "pull",
          text: `Pulling image bp:${appId}:latest...`,
          status: "running",
          layers: Array.from({ length: 4 }, (_, j) => j <= i),
        });
      }

      addLine({ id: "pull", text: `Pulling image bp:${appId}:latest`, status: "done", ms: pull.ms, layers: [true, true, true, true] });
      phaseResults.push({ id: "pull", label: "PULL", detail: pull.detail, status: "done", durationMs: pull.ms });

      // Image digest line
      await new Promise(r => setTimeout(r, 100));
      const shortDigest = instanceId?.slice(0, 12) ?? appId.slice(0, 12);
      addLine({ id: "digest", text: `Image digest: sha256:${shortDigest}...`, status: "done", color: "rgba(255,255,255,0.4)" });

      // ── Phase 2: CREATE ────────────────────────────────────
      await new Promise(r => setTimeout(r, 100));
      addLine({ id: "create", text: `Creating container uor:${appId}-ct...`, status: "running" });

      const create = await timedPhase(async () => {
        if (instanceId) {
          const containerPath = "@/modules/identity/uns/build/container";
          const { getContainer } = await import(/* @vite-ignore */ containerPath);
          const c = getContainer(instanceId);
          if (c) {
            containerId = c.id;
            return `uor:${c.id.slice(0, 12)}`;
          }
        }
        containerId = `${appId}-ct`;
        return `uor:${appId}`;
      });

      addLine({ id: "create", text: `Creating container uor:${containerId?.slice(0, 12) ?? appId}`, status: "done", ms: create.ms });
      phaseResults.push({ id: "create", label: "CREATE", detail: create.detail, status: "done", durationMs: create.ms });

      // ── Phase 3: ATTACH ────────────────────────────────────
      await new Promise(r => setTimeout(r, 80));
      addLine({ id: "attach", text: "Attaching volumes...", status: "running" });

      const attach = await timedPhase(async () => {
        if (instanceId) {
          const { orchestrator } = await import("@/modules/platform/compose/orchestrator");
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

      addLine({
        id: "attach",
        text: `Attaching volumes: ${kernelNamespaces.length} ns · ${kernelOps.length} ops`,
        status: "done",
        ms: attach.ms,
      });
      phaseResults.push({ id: "attach", label: "ATTACH", detail: attach.detail, status: "done", durationMs: attach.ms });

      // ── Phase 4: START ─────────────────────────────────────
      await new Promise(r => setTimeout(r, 80));
      addLine({ id: "start", text: `Starting process ${appLabel}...`, status: "running" });

      const start = await timedPhase(async () => appLabel);

      addLine({ id: "start", text: `Starting process ${appLabel}`, status: "done", ms: start.ms });
      phaseResults.push({ id: "start", label: "START", detail: start.detail, status: "done", durationMs: start.ms });

      // ── Phase 5: SEAL ──────────────────────────────────────
      await new Promise(r => setTimeout(r, 80));
      addLine({ id: "seal", text: "Sealing runtime...", status: "running" });

      const seal = await timedPhase(async () => {
        if (instanceId) {
          const { orchestrator } = await import("@/modules/platform/compose/orchestrator");
          const kernel = orchestrator.getKernel(appId);
          if (kernel) {
            sealHash = await kernel.seal();
            return `sha256:${sealHash.slice(0, 12)}`;
          }
        }
        const { singleProofHash } = await import("@/lib/uor-canonical");
        const proof = await singleProofHash({ app: appId, t: Date.now() });
        sealHash = proof.cid;
        return `sha256:${proof.cid.slice(0, 12)}`;
      });

      addLine({ id: "seal", text: `Sealing runtime: ${seal.detail}`, status: "done", ms: seal.ms });
      phaseResults.push({ id: "seal", label: "SEAL", detail: seal.detail, status: "done", durationMs: seal.ms });

      // ── Phase 6: READY ─────────────────────────────────────
      const totalMs = performance.now() - t0;
      await new Promise(r => setTimeout(r, 150));
      addLine({
        id: "ready",
        text: `● Container ${appId} is running (${totalMs.toFixed(0)}ms)`,
        status: "done",
        color: "#4ade80",
      });
      phaseResults.push({ id: "ready", label: "READY", detail: "interactive", status: "done", durationMs: 0 });

      // Pause to let user see the final state
      await new Promise(r => setTimeout(r, 400));

      setFading(true);
      setTimeout(() => {
        onReady({
          appId,
          instanceId,
          containerId,
          sealHash,
          phases: phaseResults,
          totalMs,
          kernelOps,
          kernelNamespaces,
        });
      }, 300);
    })();
  }, [appId, appLabel, onReady, addLine]);

  const bg = isDark ? "rgba(10,10,14,0.96)" : "rgba(20,20,28,0.95)";

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center container-boot-overlay"
      style={{
        background: bg,
        transition: "opacity 300ms ease-out",
        opacity: fading ? 0 : 1,
      }}
    >
      <div className="w-[380px] space-y-1">
        {lines.map(line => (
          <div key={line.id}>
            <TermLine
              text={line.text}
              status={line.status}
              ms={line.ms}
              color={line.color}
            />
            {line.layers && (
              <div className="space-y-0.5 mt-0.5">
                {line.layers.map((done, i) => (
                  <LayerBar key={i} index={i} total={4} done={done} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
