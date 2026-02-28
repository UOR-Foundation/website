/**
 * JupyterProjection — Keep-alive Jupyter panel with hover preloading
 */

import ProjectionShell from "./ProjectionShell";
import QuantumJupyterWorkspace from "@/modules/qkernel/notebook/QuantumJupyterWorkspace";

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
      onClose={onClose}
      id="jupyter"
      backdropColor="hsla(0, 0%, 0%, 0.4)"
      beamGradient="linear-gradient(to bottom, hsla(38, 50%, 55%, 0.0), hsla(38, 50%, 55%, 0.25), hsla(38, 50%, 55%, 0.0))"
    >
      <div className="flex-1 overflow-hidden" style={{ background: "hsl(30, 6%, 97%)" }}>
        <QuantumJupyterWorkspace onClose={onClose} />
      </div>
    </ProjectionShell>
  );
}
