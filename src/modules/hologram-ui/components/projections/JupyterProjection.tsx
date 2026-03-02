/**
 * JupyterProjection — Keep-alive Jupyter panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const QuantumJupyterWorkspace = lazy(() => import("@/hologram/kernel/notebook/QuantumJupyterWorkspace"));

interface JupyterProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function JupyterProjection({ open, preload, onClose }: JupyterProjectionProps) {
  return (
    <ProjectionShell
      open={open}
      preload={preload}
      keepAlive={false}
      onClose={onClose}
      id="jupyter"
      backdropColor="hsla(0, 0%, 0%, 0.4)"
      beamGradient="linear-gradient(to bottom, hsla(38, 50%, 55%, 0.0), hsla(38, 50%, 55%, 0.25), hsla(38, 50%, 55%, 0.0))"
    >
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(38, 50%, 55%)" }}>
            <span className="text-sm font-mono">Loading Jupyter…</span>
          </div>
        }>
          <QuantumJupyterWorkspace onClose={onClose} />
        </Suspense>
      </div>
    </ProjectionShell>
  );
}
