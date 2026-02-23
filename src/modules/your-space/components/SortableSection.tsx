/**
 * SortableSection — wraps a grid of cards with dnd-kit sortable context.
 */

import { useState, type ReactElement } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortableCard } from "./SortableCard";

interface SortableSectionProps {
  /** Stable order keys, e.g. ["security","identity","assets"] */
  initialOrder: string[];
  /** Map from key → rendered SpaceCard element */
  cards: Record<string, ReactElement>;
  storageKey: string;
  className?: string;
}

const load = (key: string, fallback: string[]): string[] => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const SortableSection = ({
  initialOrder,
  cards,
  storageKey,
  className = "grid grid-cols-1 md:grid-cols-3 gap-5",
}: SortableSectionProps) => {
  const [order, setOrder] = useState<string[]>(() => load(storageKey, initialOrder));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const next = arrayMove(
          prev,
          prev.indexOf(active.id as string),
          prev.indexOf(over.id as string),
        );
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className={className}>
          {order.map((key) => (
            <SortableCard key={key} id={key}>
              {cards[key]}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
