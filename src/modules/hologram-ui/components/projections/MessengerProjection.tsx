/**
 * MessengerProjection — Keep-alive messenger panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const HologramMessenger = lazy(() => import("../panels/HologramMessenger"));

interface MessengerProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function MessengerProjection({ open, preload, onClose }: MessengerProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="messenger">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(30, 8%, 75%)" }}>
          <span className="text-sm font-mono">Loading Messenger…</span>
        </div>
      }>
        <HologramMessenger onClose={onClose} />
      </Suspense>
    </ProjectionShell>
  );
}
