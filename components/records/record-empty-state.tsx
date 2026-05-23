import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RecordEmptyStateProps {
  actionLabel?: string;
  description?: string;
  onAdd: () => void;
}

export function RecordEmptyState({
  actionLabel = "新增第一筆資料",
  description = "先建立第一筆紀錄，之後就能切換整體與區域圖表、調整納入分析的資料範圍。",
  onAdd,
}: RecordEmptyStateProps) {
  return (
    <Card className="surface-state-panel items-center gap-2 p-8 text-center">
      <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">還沒有 InBody 紀錄</p>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <Button onClick={onAdd}>{actionLabel}</Button>
    </Card>
  );
}
