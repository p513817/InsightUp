export function DashboardRecordsSkeleton() {
  return (
    <div className="space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:space-y-5 sm:pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <section className="p-1 sm:p-2">
        <div className="mx-auto max-w-5xl">
          <div className="surface-glass-card grid gap-2 rounded-[1rem] p-3 sm:grid-cols-3 sm:p-4">
            <div className="surface-soft-card min-h-16 animate-pulse rounded-[0.875rem]" />
            <div className="surface-soft-card min-h-16 animate-pulse rounded-[0.875rem]" />
            <div className="surface-soft-card min-h-16 animate-pulse rounded-[0.875rem]" />
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <div className="surface-state-panel min-h-[13rem] animate-pulse rounded-[1.75rem]" />
        <div className="surface-state-panel min-h-[13rem] animate-pulse rounded-[1.75rem]" />
        <div className="surface-state-panel min-h-[13rem] animate-pulse rounded-[1.75rem]" />
      </div>
    </div>
  );
}
