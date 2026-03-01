/**
 * MySpaceProjection — Keep-alive My Space panel with hover preloading.
 */

import ProjectionShell from "../shell/ProjectionShell";
import MySpacePanel from "../panels/MySpacePanel";

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
