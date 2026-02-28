/**
 * QuantumWorkspaceProjection — Keep-alive panel for the Quantum Workspace
 */

import ProjectionShell from "./ProjectionShell";
import QuantumWorkspace from "./QuantumWorkspace";

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
      <div className="flex-1 overflow-hidden" style={{ background: "hsl(220, 12%, 8%)" }}>
        <QuantumWorkspace onClose={onClose} />
      </div>
    </ProjectionShell>
  );
}
