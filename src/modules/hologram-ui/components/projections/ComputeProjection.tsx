/**
 * ComputeProjection — Keep-alive compute panel with hover preloading
 */

import ProjectionShell from "../shell/ProjectionShell";
import HologramCompute from "../panels/HologramCompute";

interface ComputeProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function ComputeProjection({ open, preload, onClose }: ComputeProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="compute">
      <HologramCompute onClose={onClose} />
    </ProjectionShell>
  );
}
