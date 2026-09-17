"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableProductRowProps {
  id: string;
  children: React.ReactNode;
}

export default function SortableProductRow({
  id,
  children,
}: SortableProductRowProps) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between transition-colors ${
        isDragging ? "bg-brand-secondary/10 shadow-lg z-50 relative" : "bg-transparent"
      }`}
    >
      {children}
    </article>
  );
}

export function DragHandle({ name, id }: { name: string; id: string }) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <button
      type="button"
      aria-label={`Reordenar ${name}`}
      className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center text-brand-muted-foreground hover:text-brand-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-md touch-none"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={20} />
    </button>
  );
}
