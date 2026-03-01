/**
 * MemoryProjection — Keep-alive memory panel with hover preloading
 */

import ProjectionShell from "../shell/ProjectionShell";
import HologramMemory from "../panels/HologramMemory";

interface MemoryProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function MemoryProjection({ open, preload, onClose }: MemoryProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="memory">
      <HologramMemory onClose={onClose} />
    </ProjectionShell>
  );
}
