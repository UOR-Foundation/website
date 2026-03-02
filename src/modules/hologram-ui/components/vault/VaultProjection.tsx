/**
 * VaultProjection — Keep-alive Vault panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../ProjectionShell";

const HologramVault = lazy(() => import("./HologramVault"));

interface VaultProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
  onOpenPanel?: (panel: string) => void;
}

export default function VaultProjection({ open, preload, onClose, onOpenPanel }: VaultProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="vault">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(30, 8%, 75%)" }}>
          <span className="text-sm font-mono">Loading Vault…</span>
        </div>
      }>
        <HologramVault onClose={onClose} onOpenPanel={onOpenPanel} />
      </Suspense>
    </ProjectionShell>
  );
}
