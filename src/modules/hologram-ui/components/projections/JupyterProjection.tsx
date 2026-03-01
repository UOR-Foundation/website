/**
 * JupyterProjection — Keep-alive Jupyter panel with hover preloading
 */

import ProjectionShell from "../shell/ProjectionShell";
import QuantumJupyterWorkspace from "@/hologram/kernel/notebook/QuantumJupyterWorkspace";

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
      {/* Background is now controlled by the workspace itself based on theme */}
      <div className="flex-1 overflow-hidden">
        <QuantumJupyterWorkspace onClose={onClose} />
      </div>
    </ProjectionShell>
  );
}
