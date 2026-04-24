import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLatestIncludedRecord, listRecords } from "@/lib/inbody/records";
import { formatLongDate, getUserInitials, summarizeUser } from "@/lib/presentation";

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const summary = summarizeUser(user);
  const records = await listRecords(supabase, user.id);
  const latestIncludedRecord = getLatestIncludedRecord(records);
  const includedCount = records.filter((record) => record.isIncludedInCharts).length;
  const coveragePercentage = records.length ? Math.round((includedCount / records.length) * 100) : 0;

  return (
    <div>
      <section className="matte-panel brand-grid-lines relative overflow-hidden rounded-[1.75rem] border border-border/70 px-5 py-5 shadow-panel sm:rounded-[2rem] sm:px-8 sm:py-7">
        <div className="brand-motion-line brand-motion-line-left" />
        <div className="brand-motion-line brand-motion-line-right" />

        <div className="relative z-10 space-y-5">
          <div className="flex items-start gap-4">
            {summary.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={summary.name} className="size-14 rounded-full border border-border object-cover shadow-[0_6px_16px_rgba(16,35,63,0.10)] sm:size-16" src={summary.avatarUrl} />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full border border-border bg-[linear-gradient(135deg,rgba(121,215,195,0.42),rgba(28,54,95,0.12))] text-base font-semibold text-foreground shadow-[0_6px_16px_rgba(16,35,63,0.10)] sm:size-16">
                {getUserInitials(summary.name)}
              </div>
            )}

            <div className="min-w-0 space-y-2">
              <p className="brand-kicker">Accounts / Identity Layer</p>
              <div>
                <h1 className="break-words font-display text-3xl text-foreground sm:text-4xl">Accounts</h1>
                <p className="mt-1 text-base font-medium text-foreground/88 sm:text-lg">{summary.name}</p>
                <p className="mt-1 break-all text-sm leading-7 text-muted-foreground">{summary.email || "Signed in with Google"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/84 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Joined</p>
              <p className="mt-2 font-display text-2xl text-foreground">{formatLongDate(summary.createdAt)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/84 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Records</p>
              <p className="mt-2 font-display text-2xl text-foreground">{records.length}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/84 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
              <p className="mt-2 font-display text-2xl text-foreground">{includedCount}/{records.length || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{coveragePercentage}% 納入分析</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/84 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Latest Included</p>
              <p className="mt-2 font-display text-2xl text-foreground">{formatLongDate(latestIncludedRecord?.date)}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}