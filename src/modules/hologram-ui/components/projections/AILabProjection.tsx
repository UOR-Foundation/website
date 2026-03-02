/**
 * AILabProjection — Keep-alive panel for the AI Lab
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const AtlasProjectionLab = lazy(() => import("@/pages/AtlasProjectionLab"));

interface Props {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function AILabProjection({ open, preload, onClose }: Props) {
  return (
    <ProjectionShell
      open={open}
      preload={preload}
      onClose={onClose}
      id="ai-lab"
      backdropColor="hsla(250, 15%, 4%, 0.5)"
      beamGradient="linear-gradient(to bottom, hsla(260, 50%, 50%, 0.0), hsla(260, 50%, 50%, 0.25), hsla(260, 50%, 50%, 0.0))"
    >
      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <span className="text-muted-foreground text-sm font-mono">Loading AI Lab…</span>
          </div>
        }>
          <AtlasProjectionLab />
        </Suspense>
      </div>
    </ProjectionShell>
  );
}
