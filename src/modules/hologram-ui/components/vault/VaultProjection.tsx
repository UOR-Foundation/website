/**
 * VaultProjection — Keep-alive Vault panel with hover preloading
 */

import ProjectionShell from "../ProjectionShell";
import HologramVault from "./HologramVault";

interface VaultProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
  onOpenPanel?: (panel: string) => void;
}

export default function VaultProjection({ open, preload, onClose, onOpenPanel }: VaultProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="vault">
      <HologramVault onClose={onClose} onOpenPanel={onOpenPanel} />
    </ProjectionShell>
  );
}
