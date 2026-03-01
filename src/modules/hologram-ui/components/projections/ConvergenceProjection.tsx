/**
 * ConvergenceProjection — Inline reasoning interface within Hologram OS
 * ═════════════════════════════════════════════════════════════════════
 *
 * Wraps ConvergenceChat in a ProjectionShell so it fills the main
 * content area alongside the sidebar, rather than navigating away.
 */

import ProjectionShell from "../shell/ProjectionShell";
import ConvergenceChat from "../lumen/ConvergenceChat";

interface ConvergenceProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function ConvergenceProjection({ open, preload, onClose }: ConvergenceProjectionProps) {
  return (
    <ProjectionShell
      open={open}
      preload={preload}
      onClose={onClose}
      id="convergence"
      backdropColor="hsla(25, 8%, 3%, 0.4)"
      beamGradient="linear-gradient(to bottom, hsla(280, 40%, 55%, 0.0), hsla(280, 40%, 55%, 0.12), hsla(38, 40%, 55%, 0.08), hsla(38, 40%, 55%, 0.0))"
    >
      <div className="flex-1 h-full overflow-hidden">
        <ConvergenceChat embedded onClose={onClose} />
      </div>
    </ProjectionShell>
  );
}
