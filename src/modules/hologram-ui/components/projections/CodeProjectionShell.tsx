/**
 * CodeProjectionShell — Hologram Code Projection Wrapper
 * ═══════════════════════════════════════════════════════
 *
 * Wraps HologramCode in the standard ProjectionShell pattern
 * with keep-alive mounting and hover preloading.
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const HologramCode = lazy(() => import("@/modules/hologram-code/HologramCode"));

interface CodeProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function CodeProjectionShell({ open, preload, onClose }: CodeProjectionProps) {
  return (
    <ProjectionShell
      open={open}
      preload={preload}
      onClose={onClose}
      id="code"
      backdropColor="hsla(220, 15%, 4%, 0.5)"
      beamGradient="linear-gradient(to bottom, hsla(210, 80%, 50%, 0.0), hsla(210, 80%, 50%, 0.15), hsla(210, 80%, 50%, 0.0))"
    >
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center h-full w-full"
            style={{ background: "#1e1e1e", color: "#858585", fontFamily: "system-ui" }}
          >
            <div className="text-center">
              <div className="text-[14px] mb-1">Loading Hologram Code…</div>
              <div className="text-[12px] opacity-60">Initializing Monaco Editor</div>
            </div>
          </div>
        }
      >
        <HologramCode onClose={onClose} />
      </Suspense>
    </ProjectionShell>
  );
}
