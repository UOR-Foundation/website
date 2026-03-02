/**
 * PackageManagerProjection — Keep-alive package manager panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const PackageManagerPanel = lazy(() => import("../panels/PackageManagerPanel"));

interface PackageManagerProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function PackageManagerProjection({ open, preload, onClose }: PackageManagerProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} keepAlive={false} onClose={onClose} id="packages">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(30, 8%, 75%)" }}>
          <span className="text-sm font-mono">Loading Packages…</span>
        </div>
      }>
        <PackageManagerPanel onClose={onClose} />
      </Suspense>
    </ProjectionShell>
  );
}
