import { GoalProgressBar } from "@/components/ui/goal-progress-bar";
import { cn } from "@/lib/utils";

interface GoalMetricProgressCardProps {
  className?: string;
  detail: string;
  metricLabel: string;
  progressClassName?: string;
  progressPercent: number;
}

export function GoalMetricProgressCard({
  className,
  detail,
  metricLabel,
  progressClassName,
  progressPercent,
}: GoalMetricProgressCardProps) {
  return (
    <div className={cn("rounded-[1rem] bg-white/58 p-3", className)}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="shrink-0 text-sm font-semibold text-foreground">{metricLabel}</p>
          <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">{detail}</p>
        </div>
      </div>

      <GoalProgressBar className={cn("mt-3 h-7", progressClassName)} value={progressPercent} />
    </div>
  );
}
