"use client";

import { useTranslations } from "@/components/i18n-provider";
import { Card } from "@/components/ui/card";
import { getMetricDeltaToneClass } from "@/lib/inbody/progress";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Eye, EyeOff, GripVertical } from "lucide-react";
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
  editMode?: boolean;
  items: FriendCompareMetricItem[];
  sortByDiff?: boolean;
  storageKey: string;
}

function transformToCss(transform: ReturnType<typeof useSortable>["transform"]) {
  if (!transform) {
    return undefined;
  }

  return `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

function getDiffDelta(item: FriendCompareMetricItem) {
  return item.friendValue != null && item.myValue != null ? item.friendValue - item.myValue : null;
}

function getAbsDiff(item: FriendCompareMetricItem) {
  const diffDelta = getDiffDelta(item);
  return diffDelta == null ? -1 : Math.abs(diffDelta);
}

function SortableCompareCard({
  canHide,
  editMode,
  item,
  onHide,
  sortByDiff,
}: {
  canHide: boolean;
  editMode: boolean;
  item: FriendCompareMetricItem;
  onHide: (metricKey: string) => void;
  sortByDiff: boolean;
}) {
  const t = useTranslations();
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    disabled: editMode || sortByDiff,
    id: item.key,
    transition: {
      duration: 120,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });
  const diffDelta = getDiffDelta(item);

  return (
    <Card
      className={`gap-1.5 rounded-[1rem] border-border/60 px-2.5 py-2 shadow-[0_10px_22px_rgba(16,35,63,0.05)] ${
        item.isSecondary ? "bg-card/78" : "bg-card/94"
      } ${editMode ? "border-accent/70 bg-card shadow-[0_14px_30px_rgba(23,52,93,0.13)]" : ""} ${
        isDragging ? "z-20 cursor-grabbing border-accent/65 opacity-95 shadow-[0_18px_34px_rgba(16,35,63,0.16)]" : ""
      }`}
      ref={setNodeRef}
      style={{
        transform: transformToCss(transform),
        transition: isDragging ? "none" : transition,
      }}
    >
      <div className="grid min-w-0 grid-cols-[2rem_minmax(4rem,1fr)_minmax(3.25rem,0.72fr)_minmax(3.25rem,0.72fr)_minmax(3.25rem,0.72fr)] items-center gap-1.5">
        {editMode ? (
          <button
            aria-label={`${t("common.hide")} ${item.label}`}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-danger/8 hover:text-danger active:scale-[0.94] active:rotate-3 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canHide}
            onClick={() => onHide(item.key)}
            title={canHide ? `${t("common.hide")} ${item.label}` : item.label}
            type="button"
          >
            <EyeOff className="size-4" />
          </button>
        ) : (
          <button
            aria-label={item.label}
            className="grid size-8 shrink-0 touch-none cursor-grab place-items-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-primary/7 hover:text-primary active:scale-[0.94] active:rotate-3 active:cursor-grabbing disabled:cursor-default disabled:opacity-60"
            disabled={sortByDiff}
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
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

export function FriendCompareGrid({ editMode = false, items, sortByDiff = false, storageKey }: FriendCompareGridProps) {
  const [orderedKeys, setOrderedKeys] = useState(() => items.map((item) => item.key));
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
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

  useEffect(() => {
    const storedValue = window.localStorage.getItem(`${storageKey}.hidden`);

    if (!storedValue) {
      setHiddenKeys([]);
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as string[];
      const itemKeys = new Set(items.map((item) => item.key));
      setHiddenKeys(parsed.filter((key) => itemKeys.has(key)));
    } catch {
      setHiddenKeys([]);
    }
  }, [items, storageKey]);

  const orderedItems = orderedKeys
    .map((key) => items.find((item) => item.key === key))
    .filter((item): item is FriendCompareMetricItem => Boolean(item));
  const visibleItems = orderedItems
    .filter((item) => !hiddenKeys.includes(item.key))
    .sort((left, right) => (sortByDiff ? getAbsDiff(right) - getAbsDiff(left) : 0));
  const hiddenItems = orderedItems.filter((item) => hiddenKeys.includes(item.key));
  const canHideVisibleMetric = visibleItems.length > 1;

  function handleDragEnd(event: DragEndEvent) {
    if (sortByDiff) {
      return;
    }

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

  function applyHiddenKeys(nextHiddenKeys: string[]) {
    setHiddenKeys(nextHiddenKeys);
    window.localStorage.setItem(`${storageKey}.hidden`, JSON.stringify(nextHiddenKeys));
  }

  function hideMetric(metricKey: string) {
    if (!canHideVisibleMetric || hiddenKeys.includes(metricKey)) {
      return;
    }

    applyHiddenKeys([...hiddenKeys, metricKey]);
  }

  function restoreMetric(metricKey: string) {
    applyHiddenKeys(hiddenKeys.filter((key) => key !== metricKey));
  }

  return (
    <section className="space-y-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext items={visibleItems.map((item) => item.key)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {visibleItems.map((item) => (
              <SortableCompareCard
                canHide={canHideVisibleMetric}
                editMode={editMode}
                item={item}
                key={item.key}
                onHide={hideMetric}
                sortByDiff={sortByDiff}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editMode && hiddenItems.length ? (
        <div className="rounded-[1rem] border border-dashed border-border/80 bg-card/55 px-3 py-3">
          <div className="flex flex-wrap gap-2">
            {hiddenItems.map((item) => (
              <button
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 text-xs font-semibold text-muted-foreground transition-[background-color,color,transform] hover:bg-primary/7 hover:text-primary active:scale-[0.96]"
                key={item.key}
                onClick={() => restoreMetric(item.key)}
                type="button"
              >
                <Eye className="size-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
