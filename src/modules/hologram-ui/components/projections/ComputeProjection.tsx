/**
 * ComputeProjection — Keep-alive compute panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const HologramCompute = lazy(() => import("../panels/HologramCompute"));

interface ComputeProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function ComputeProjection({ open, preload, onClose }: ComputeProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="compute">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(30, 8%, 75%)" }}>
          <span className="text-sm font-mono">Loading Compute…</span>
        </div>
      }>
        <HologramCompute onClose={onClose} />
      </Suspense>
    </ProjectionShell>
  );
}
