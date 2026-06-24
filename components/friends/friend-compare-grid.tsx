"use client";

import { useTranslations } from "@/components/i18n-provider";
import { Card } from "@/components/ui/card";
import { getMetricDeltaToneClass } from "@/lib/inbody/progress";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { useEffect, useState } from "react";

export type FriendCompareMetricItem = {
  diffText: string;
  friendText: string;
  friendValue: number | null;
  isSecondary: boolean;
  key: string;
  label: string;
  myText: string;
  myValue: number | null;
  unit: string;
};

interface FriendCompareGridProps {
  items: FriendCompareMetricItem[];
  storageKey: string;
}

function transformToCss(transform: ReturnType<typeof useSortable>["transform"]) {
  if (!transform) {
    return undefined;
  }

  return `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

function SortableCompareCard({ item }: { item: FriendCompareMetricItem }) {
  const t = useTranslations();
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: item.key,
    transition: {
      duration: 120,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });
  const diffDelta = item.friendValue != null && item.myValue != null ? item.friendValue - item.myValue : null;

  return (
    <Card
      className={`gap-1.5 rounded-[1rem] border-border/60 px-2.5 py-2 shadow-[0_10px_22px_rgba(16,35,63,0.05)] ${
        item.isSecondary ? "bg-card/78" : "bg-card/94"
      } ${isDragging ? "z-20 cursor-grabbing border-accent/65 opacity-95 shadow-[0_18px_34px_rgba(16,35,63,0.16)]" : ""}`}
      ref={setNodeRef}
      style={{
        transform: transformToCss(transform),
        transition: isDragging ? "none" : transition,
      }}
    >
      <div className="grid min-w-0 grid-cols-[2rem_minmax(4rem,1fr)_minmax(3.25rem,0.72fr)_minmax(3.25rem,0.72fr)_minmax(3.25rem,0.72fr)] items-center gap-1.5">
        <button
          aria-label={item.label}
          className="grid size-8 shrink-0 touch-none cursor-grab place-items-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-primary/7 hover:text-primary active:scale-[0.94] active:rotate-3 active:cursor-grabbing"
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase leading-none text-muted-foreground">{item.unit || "-"}</p>
          <p className="mt-1 truncate font-display text-[0.98rem] leading-tight text-foreground">{item.label}</p>
        </div>
        <div className="min-w-0 border-l border-border/55 px-1.5 py-1">
          <p className="truncate text-[10px] font-semibold uppercase leading-none text-muted-foreground">{t("friends.me")}</p>
          <p className="mt-1 truncate font-display text-[0.9rem] leading-none text-foreground">{item.myText}</p>
        </div>
        <div className="min-w-0 border-l border-border/55 px-1.5 py-1">
          <p className="truncate text-[10px] font-semibold uppercase leading-none text-muted-foreground">{t("friends.friend")}</p>
          <p className="mt-1 truncate font-display text-[0.9rem] leading-none text-foreground">{item.friendText}</p>
        </div>
        <div className="min-w-0 border-l border-border/55 px-1.5 py-1">
          <p className="truncate text-[10px] font-semibold uppercase leading-none text-muted-foreground">{t("friends.diff")}</p>
          <p className={`mt-1 truncate font-display text-[0.9rem] leading-none ${getMetricDeltaToneClass(item.key, diffDelta)}`}>{item.diffText}</p>
        </div>
      </div>
    </Card>
  );
}

export function FriendCompareGrid({ items, storageKey }: FriendCompareGridProps) {
  const [orderedKeys, setOrderedKeys] = useState(() => items.map((item) => item.key));
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as string[];
      const itemKeys = new Set(items.map((item) => item.key));
      const keptKeys = parsed.filter((key) => itemKeys.has(key));
      const missingKeys = items.map((item) => item.key).filter((key) => !keptKeys.includes(key));
      setOrderedKeys([...keptKeys, ...missingKeys]);
    } catch {
      setOrderedKeys(items.map((item) => item.key));
    }
  }, [items, storageKey]);

  const orderedItems = orderedKeys
    .map((key) => items.find((item) => item.key === key))
    .filter((item): item is FriendCompareMetricItem => Boolean(item));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setOrderedKeys((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      const nextKeys = arrayMove(current, oldIndex, newIndex);
      window.localStorage.setItem(storageKey, JSON.stringify(nextKeys));
      return nextKeys;
    });
  }

  return (
    <section className="space-y-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext items={orderedItems.map((item) => item.key)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {orderedItems.map((item) => (
              <SortableCompareCard item={item} key={item.key} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
