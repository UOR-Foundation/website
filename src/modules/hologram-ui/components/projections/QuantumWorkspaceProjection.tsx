/**
 * QuantumWorkspaceProjection — Keep-alive panel for the Quantum Workspace
 */

import ProjectionShell from "../shell/ProjectionShell";
import QuantumWorkspace from "../panels/QuantumWorkspace";

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
      {/* Background controlled by workspace theme */}
      <div className="flex-1 overflow-hidden">
        <QuantumWorkspace onClose={onClose} />
      </div>
    </ProjectionShell>
  );
}
