/**
 * MySpaceProjection — Keep-alive My Space panel with hover preloading.
 */

import ProjectionShell from "./ProjectionShell";
import MySpacePanel from "./MySpacePanel";

interface MySpaceProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
}

export default function MySpaceProjection({ open, preload, onClose }: MySpaceProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="myspace">
      <MySpacePanel onClose={onClose} />
    </ProjectionShell>
  );
}
