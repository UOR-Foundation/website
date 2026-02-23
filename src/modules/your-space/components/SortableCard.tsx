/**
 * SortableCard — wraps SpaceCard with dnd-kit sortable behaviour.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

interface SortableCardProps {
  id: string;
  children: ReactNode;
}

export const SortableCard = ({ id, children }: SortableCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {typeof children === "object" && children !== null
        ? (() => {
            // Clone the child and inject dragListeners
            const child = children as React.ReactElement<{ dragListeners?: Record<string, unknown> }>;
            return <child.type {...child.props} dragListeners={listeners} />;
          })()
        : children}
    </div>
  );
};
