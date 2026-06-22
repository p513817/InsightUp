import { cn } from "@/lib/utils";

type WorkspaceLoadingSkeletonProps = {
  className?: string;
  variant?: "dashboard" | "list";
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[1rem] bg-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.54)]", className)} />;
}

function StatSkeleton() {
  return (
    <div className="surface-glass-card min-h-20 rounded-[1.1rem] p-3">
      <SkeletonBlock className="h-3 w-16 rounded-full" />
      <SkeletonBlock className="mt-3 h-6 w-20 rounded-full" />
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="dashboard-card-soft dashboard-data-panel rounded-[1.75rem] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SkeletonBlock className="size-7 rounded-full" />
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
        <SkeletonBlock className="h-4 w-14 rounded-full" />
      </div>
      <SkeletonBlock className="mt-2 h-16 rounded-[1rem] sm:h-[4.75rem]" />
    </div>
  );
}

function ListItemSkeleton() {
  return (
    <div className="surface-glass-card rounded-[1.4rem] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-4 w-36 rounded-full" />
          <SkeletonBlock className="mt-3 h-3 w-52 max-w-full rounded-full" />
        </div>
        <SkeletonBlock className="size-10 rounded-full" />
      </div>
      <SkeletonBlock className="mt-4 h-16 rounded-[1rem]" />
    </div>
  );
}

export function WorkspaceLoadingSkeleton({ className, variant = "dashboard" }: WorkspaceLoadingSkeletonProps) {
  const isDashboard = variant === "dashboard";

  return (
    <div className={cn("space-y-4 pb-24 sm:space-y-6 sm:pb-28", className)}>
      <div className="grid grid-cols-3 gap-1.5">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>

      {isDashboard ? (
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <MetricSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <ListItemSkeleton key={index} />
          ))}
        </div>
      )}
    </div>
  );
}
