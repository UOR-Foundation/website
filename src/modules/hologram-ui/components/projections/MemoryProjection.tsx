/**
 * MemoryProjection — Keep-alive memory panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const HologramMemory = lazy(() => import("../panels/HologramMemory"));

interface MemoryProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function MemoryProjection({ open, preload, onClose }: MemoryProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="memory">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(30, 8%, 75%)" }}>
          <span className="text-sm font-mono">Loading Memory…</span>
        </div>
      }>
        <HologramMemory onClose={onClose} />
      </Suspense>
    </ProjectionShell>
  );
}
