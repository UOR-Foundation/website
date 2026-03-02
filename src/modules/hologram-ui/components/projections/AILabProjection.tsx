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
      onClose={onClose}
      id="ai-lab"
    >
      <div className="flex-1 overflow-y-auto" style={{
        background: "hsl(25, 8%, 7%)",
        color: "hsl(30, 8%, 92%)",
      }}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <span className="text-sm font-mono" style={{ color: "hsl(30, 6%, 45%)" }}>Loading AI Lab…</span>
          </div>
        }>
          <AtlasProjectionLab />
        </Suspense>
      </div>
    </ProjectionShell>
  );
}
