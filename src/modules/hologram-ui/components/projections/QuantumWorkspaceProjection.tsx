/**
 * QuantumWorkspaceProjection — Keep-alive panel for the Quantum Workspace
 * Lazy-loaded to prevent browser freeze from the 2400+ line component.
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const QuantumWorkspace = lazy(() => import("../panels/QuantumWorkspace"));

interface Props {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function QuantumWorkspaceProjection({ open, preload, onClose }: Props) {
  return (
    <ProjectionShell
      open={open}
      preload={preload}
      onClose={onClose}
      id="quantum-workspace"
      backdropColor="hsla(220, 15%, 4%, 0.5)"
      beamGradient="linear-gradient(to bottom, hsla(200, 60%, 50%, 0.0), hsla(200, 60%, 50%, 0.3), hsla(200, 60%, 50%, 0.0))"
    >
      <div className="flex-1 overflow-hidden" style={{
        background: "hsl(25, 8%, 7%)",
        color: "hsl(30, 8%, 92%)",
      }}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <span className="text-sm font-mono" style={{ color: "hsl(200, 40%, 50%)" }}>Loading Quantum Lab…</span>
          </div>
        }>
          <QuantumWorkspace onClose={onClose} />
        </Suspense>
      </div>
    </ProjectionShell>
  );
}
