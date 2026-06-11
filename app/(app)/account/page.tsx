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
    <div>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/45 bg-transparent px-3 py-3 sm:rounded-[2rem] sm:px-5 sm:py-5">
        <div className="brand-motion-line brand-motion-line-left" />
        <div className="brand-motion-line brand-motion-line-right" />

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_0.78fr_0.7fr_1.15fr]">
            <CompactInfoCard className="min-w-0" label={t("account.title")} minWidthClassName="" variant="glass">
              <div className="mt-2 flex items-start gap-2.5">
                {summary.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={summary.name} className="size-11 rounded-full border border-border object-cover shadow-[0_6px_14px_rgba(16,35,63,0.07)] sm:size-12" src={summary.avatarUrl} />
                ) : (
                  <div className="surface-avatar-fallback flex size-11 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_6px_14px_rgba(16,35,63,0.07)] sm:size-12">
                    {getUserInitials(summary.name)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="break-words font-display text-[1.05rem] leading-tight text-foreground sm:text-[1.15rem]">{summary.name}</p>
                  <p className="mt-1 break-all text-[11px] leading-5 text-muted-foreground">{summary.email || "Signed in with Google"}</p>
                </div>
              </div>
            </CompactInfoCard>

            <CompactInfoCard className="min-w-0" label={t("account.joinedAt")} minWidthClassName="" value={formatCompactDate(summary.createdAt, locale)} />

            <CompactInfoCard className="min-w-0" label={t("common.settings")} minWidthClassName="" value={planDisplayName} valueClassName="break-words leading-tight" />

            <FriendCodeCard friendCode={ownProfile.friendCode} />
          </div>
        </div>
      </section>
    </div>
  );
}
