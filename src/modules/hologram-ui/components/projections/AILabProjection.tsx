/**
 * AILabProjection — Keep-alive panel for the AI Lab
 * Uses the same ProjectionShell as every other sidebar projection
 * for consistent slide-in animation and visual language.
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
      backdropColor="hsla(25, 10%, 4%, 0.5)"
      beamGradient="linear-gradient(to bottom, hsla(38, 40%, 50%, 0.0), hsla(38, 40%, 50%, 0.15), hsla(38, 40%, 50%, 0.0))"
    >
      <div className="flex-1 overflow-y-auto" style={{
        background: "hsl(var(--hologram-bg))",
        color: "hsl(var(--hologram-text))",
      }}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <span className="text-sm font-mono" style={{ color: "hsl(260, 40%, 55%)" }}>Loading AI Lab…</span>
          </div>
        }>
          <AtlasProjectionLab />
        </Suspense>
      </div>
    </ProjectionShell>
  );
}
