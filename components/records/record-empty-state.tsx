"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslations } from "@/components/i18n-provider";

interface RecordEmptyStateProps {
  actionLabel?: string;
  description?: string;
  onAdd: () => void;
}

export function RecordEmptyState({
  actionLabel,
  description,
  onAdd,
}: RecordEmptyStateProps) {
  const t = useTranslations();

  return (
    <Card className="surface-state-panel items-center gap-2 p-8 text-center">
      <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">{t("records.empty.title")}</p>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description || t("records.empty.description")}</p>
      <Button onClick={onAdd}>{actionLabel || t("records.empty.action")}</Button>
    </Card>
  );
}
