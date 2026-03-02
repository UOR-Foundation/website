/**
 * MySpaceProjection — Keep-alive My Space panel with hover preloading.
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const MySpacePanel = lazy(() => import("../panels/MySpacePanel"));

interface MySpaceProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function MySpaceProjection({ open, preload, onClose }: MySpaceProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="myspace">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(30, 8%, 75%)" }}>
          <span className="text-sm font-mono">Loading My Space…</span>
        </div>
      }>
        <MySpacePanel onClose={onClose} />
      </Suspense>
    </ProjectionShell>
  );
}
