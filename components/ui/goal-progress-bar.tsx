import { cn } from "@/lib/utils";

export function formatGoalProgressValue(value: number) {
  return `${Math.round(value)}%`;
}

interface GoalProgressBarProps {
  className?: string;
  hasGoals?: boolean;
  label?: string | null;
  value: number;
}

export function GoalProgressBar({
  className,
  hasGoals = true,
  value,
  label = formatGoalProgressValue(value),
}: GoalProgressBarProps) {
  const percent = Math.max(0, Math.min(100, value));
  const setbackPercent = Math.max(0, Math.min(100, Math.abs(value)));
  const isNegative = hasGoals && value < 0;
  const labelInside = !isNegative && percent >= 50;
  const ariaValue = Math.max(-100, Math.min(100, Math.round(value)));

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={-100}
      aria-valuenow={ariaValue}
      aria-valuetext={label || undefined}
      className={cn(
        "relative h-7 overflow-hidden rounded-full bg-foreground/[0.06]",
        isNegative ? "bg-[rgb(var(--primary)/0.08)] ring-1 ring-[rgb(var(--primary)/0.18)]" : "",
        className,
      )}
      role="progressbar"
    >
      <div
        className={cn(
          "absolute top-0 h-full rounded-full transition-[width] duration-300",
          isNegative
            ? "right-0 bg-[repeating-linear-gradient(135deg,rgb(var(--primary-strong)/0.72)_0_6px,rgb(var(--primary)/0.34)_6px_12px)]"
            : "left-0",
          !isNegative && hasGoals ? "bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)]" : "",
          !isNegative && !hasGoals ? "bg-foreground/15" : "",
        )}
        style={{ width: `${isNegative ? setbackPercent : percent}%` }}
      />
      {isNegative ? <div aria-hidden="true" className="absolute right-0 top-0 h-full w-px bg-[rgb(var(--primary-strong)/0.5)]" /> : null}
      {label ? (
        <span
          className={cn(
            "absolute top-1/2 inline-flex -translate-y-1/2 truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums sm:text-xs",
            isNegative
              ? "left-1 text-[rgb(var(--primary-strong))]"
              : labelInside
                ? "text-white drop-shadow-[0_1px_1px_rgba(15,23,42,0.35)]"
                : hasGoals
                  ? "text-[rgb(var(--primary-strong))]"
                  : "text-muted-foreground",
            labelInside ? "justify-end" : "justify-start",
          )}
          style={isNegative ? undefined : labelInside ? { right: `${100 - percent}%` } : { left: `${percent}%` }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
