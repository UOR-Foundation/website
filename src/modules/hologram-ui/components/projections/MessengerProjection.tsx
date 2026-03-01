/**
 * MessengerProjection — Keep-alive messenger panel with hover preloading
 */

import ProjectionShell from "../shell/ProjectionShell";
import HologramMessenger from "../panels/HologramMessenger";

interface MessengerProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function MessengerProjection({ open, preload, onClose }: MessengerProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="messenger">
      <HologramMessenger onClose={onClose} />
    </ProjectionShell>
  );
}
