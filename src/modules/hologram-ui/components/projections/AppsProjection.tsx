/**
 * AppsProjection — Keep-alive Apps panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const AppsPanel = lazy(() => import("../panels/AppsPanel"));

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
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(30, 8%, 75%)" }}>
          <span className="text-sm font-mono">Loading Apps…</span>
        </div>
      }>
        <AppsPanel onClose={onClose} onOpenPanel={onOpenPanel} onNavigate={onNavigate} />
      </Suspense>
    </ProjectionShell>
  );
}
