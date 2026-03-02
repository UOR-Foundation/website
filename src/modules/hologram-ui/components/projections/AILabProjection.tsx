/**
 * AILabProjection — Full-screen AI Lab using standard ProjectionShell
 * for consistent holographic projection transitions across all panels.
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
      keepAlive={false}
      onClose={onClose}
      id="ai-lab"
      backdropColor="hsla(20, 8%, 3%, 0.5)"
      beamGradient="linear-gradient(to bottom, hsla(38, 50%, 55%, 0.0), hsla(38, 50%, 55%, 0.2), hsla(38, 50%, 55%, 0.0))"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{
          background: "hsl(25, 8%, 7%)",
          color: "hsl(30, 10%, 45%)",
        }}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "hsla(38, 40%, 55%, 0.3)", borderTopColor: "transparent" }} />
            <span className="text-sm font-mono">
              Preparing AI Lab…
            </span>
          </div>
        </div>
      }>
        <AtlasProjectionLab onClose={onClose} />
      </Suspense>
    </ProjectionShell>
  );
}
