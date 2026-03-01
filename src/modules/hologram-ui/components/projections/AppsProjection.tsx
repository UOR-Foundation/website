/**
 * AppsProjection — Keep-alive Apps panel with hover preloading
 */

import ProjectionShell from "../shell/ProjectionShell";
import AppsPanel from "../panels/AppsPanel";

interface AppsProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
  onOpenPanel?: (panel: string) => void;
  onNavigate?: (route: string) => void;
}

export default function AppsProjection({ open, preload, onClose, onOpenPanel, onNavigate }: AppsProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="apps">
      <AppsPanel onClose={onClose} onOpenPanel={onOpenPanel} onNavigate={onNavigate} />
    </ProjectionShell>
  );
}
