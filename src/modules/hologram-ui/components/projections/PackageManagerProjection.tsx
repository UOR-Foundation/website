/**
 * PackageManagerProjection — Keep-alive package manager panel with hover preloading
 */

import ProjectionShell from "../shell/ProjectionShell";
import PackageManagerPanel from "../panels/PackageManagerPanel";

interface PackageManagerProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function PackageManagerProjection({ open, preload, onClose }: PackageManagerProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="packages">
      <PackageManagerPanel onClose={onClose} />
    </ProjectionShell>
  );
}
