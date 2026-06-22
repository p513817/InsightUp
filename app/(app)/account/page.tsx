import { FriendCodeCard } from "@/components/friends/friend-code-card";
import { CompactInfoCard } from "@/components/ui/compact-info-card";
import { ensureCurrentUserProfile } from "@/lib/friends/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCompactDate, getUserInitials, summarizeUser } from "@/lib/presentation";
import { getServerTranslations } from "@/lib/i18n/server";

async function getCurrentPlanDisplayName(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const nowIso = new Date().toISOString();
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("plan_code")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .lte("starts_at", nowIso)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const targetPlanCode = subscription?.plan_code;

  if (targetPlanCode) {
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("display_name")
      .eq("code", targetPlanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (plan?.display_name) {
      return plan.display_name;
    }
  }

  const { data: fallbackPlan } = await supabase
    .from("subscription_plans")
    .select("display_name")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  return fallbackPlan?.display_name || "Free";
}

export default async function AccountPage() {
  const { locale, t } = await getServerTranslations();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const summary = summarizeUser(user);
  const ownProfile = await ensureCurrentUserProfile(supabase, user);
  const planDisplayName = await getCurrentPlanDisplayName(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-border/55 bg-card/72 px-4 py-4 shadow-[0_14px_36px_rgba(16,35,63,0.06)] sm:rounded-[1.75rem] sm:px-5 sm:py-5">
        <div className="brand-motion-line brand-motion-line-left" />
        <div className="brand-motion-line brand-motion-line-right" />

        <div className="relative z-10 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-stretch">
            <div className="surface-glass-card rounded-[1.15rem] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  {summary.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={summary.name} className="size-14 rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.08)] sm:size-16" src={summary.avatarUrl} />
                  ) : (
                    <div className="surface-avatar-fallback flex size-14 items-center justify-center rounded-full border border-border text-base font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.08)] sm:size-16">
                      {getUserInitials(summary.name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">{t("account.title")}</p>
                    <h1 className="mt-2 break-words font-display text-[1.6rem] leading-tight text-foreground sm:text-[2rem]">{summary.name}</h1>
                    <p className="mt-1 break-all text-sm leading-6 text-muted-foreground">{summary.email || t("account.signedInWithGoogle")}</p>
                  </div>
                </div>
              </div>
            </div>

            <CompactInfoCard
              className="min-w-0 px-4 py-4 sm:px-5"
              label={t("account.plan")}
              minWidthClassName=""
              value={planDisplayName}
              valueClassName="break-words text-[1.55rem] leading-tight"
              variant="glass"
            >
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("account.planDescription")}</p>
            </CompactInfoCard>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)]">
            <CompactInfoCard
              className="min-w-0 px-4 py-4 sm:px-5"
              label={t("account.joinedAt")}
              minWidthClassName=""
              value={formatCompactDate(summary.createdAt, locale)}
              valueClassName="break-words text-[1.35rem] leading-tight"
            >
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("account.joinedAtDescription")}</p>
            </CompactInfoCard>

            <FriendCodeCard
              className="min-w-0 px-4 py-4 sm:px-5"
              description={t("account.friendCodeDescription")}
              friendCode={ownProfile.friendCode}
              title={t("account.friendCode")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
