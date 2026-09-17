"use client";

import React, { useTransition, useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface ProductSortableListProps {
  categoryId: string;
  initialProductIds: string[];
  reorderAction: (categoryId: string, orderedIds: string[]) => Promise<void>;
  children: React.ReactNode;
}

export default function ProductSortableList({
  categoryId,
  initialProductIds,
  reorderAction,
  children,
}: ProductSortableListProps) {
  const [productIds, setProductIds] = useState(initialProductIds);
  const [isPending, startTransition] = useTransition();

  // Sync state with props in case of server revalidation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProductIds(initialProductIds);
  }, [initialProductIds]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = productIds.indexOf(String(active.id));
      const newIndex = productIds.indexOf(String(over.id));

      const newProductIds = arrayMove(productIds, oldIndex, newIndex);
      setProductIds(newProductIds); // Optimistic UI update

      startTransition(async () => {
        try {
          await reorderAction(categoryId, newProductIds);
        } catch (err) {
          console.error("Erro ao reordenar produtos:", err);
          // Rollback
          setProductIds(initialProductIds);
        }
      });
    }
  }

  const childrenMap = new Map<string, React.ReactNode>();
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const props = child.props as { id?: string | number };
      if (props.id != null) {
        childrenMap.set(String(props.id), child);
      }
    }
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={productIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="divide-y divide-brand-border relative">
          {isPending && (
            <div className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white shadow z-10 animate-pulse">
              Salvando ordem...
            </div>
          )}
          {productIds.map((id) => childrenMap.get(id))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
