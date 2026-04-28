import Image from "next/image";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginProductIntroModal } from "@/components/auth/login-product-intro-modal";
import { LoginSignalBadges } from "@/components/auth/login-signal-badges";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const authState = pickFirst(resolvedSearchParams?.auth);
  const authMessage = pickFirst(resolvedSearchParams?.message);

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgb(var(--accent)/0.16),transparent_0_24%),linear-gradient(180deg,rgb(var(--surface))_0%,rgb(var(--background))_56%,rgb(var(--surface-alt))_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgb(var(--primary-strong)/0.12),transparent_0_60%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <section className="animate-fade-up w-full max-w-xl rounded-[2rem] border border-border/60 bg-card/80 px-4 py-5 text-center shadow-[0_18px_40px_rgba(16,35,63,0.08)] backdrop-blur-[10px] sm:px-6 sm:py-7">
          <div className="animate-fade-up-delay-1 mx-auto inline-flex items-center gap-3 rounded-full border border-border/60 bg-[linear-gradient(180deg,rgb(var(--card)/0.96)_0%,rgb(var(--surface)/0.88)_100%)] px-4 py-3 shadow-[0_12px_24px_rgba(16,35,63,0.06)] sm:gap-3.5 sm:px-4.5">
            <Image alt="InsightUp" className="size-12 rounded-full sm:size-14" height={56} priority src="/insightup-logo-rmbg.png" width={56} />
            <div className="text-left">
              <p className="font-display text-[1.75rem] leading-none text-foreground sm:text-[2rem]">InsightUp</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]">InBody tracker</p>
            </div>
          </div>

          <div className="animate-fade-up-delay-2 mt-5 flex items-center justify-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-primary-strong sm:text-[0.76rem]">
            <span className="inline-block h-px w-8 rounded-full bg-[linear-gradient(90deg,rgb(var(--accent)/0.25),rgb(var(--primary-strong)/0.75))] sm:w-10" />
            <p className="font-display text-center text-[0.82rem] tracking-[0.18em] sm:text-[0.88rem]">See Deeper, Move Upward</p>
            <span className="inline-block h-px w-8 rounded-full bg-[linear-gradient(90deg,rgb(var(--primary-strong)/0.75),rgb(var(--accent)/0.25))] sm:w-10" />
          </div>

          <LoginSignalBadges />

          <div className="animate-fade-up-delay-4 mt-5 grid gap-2.5 sm:max-w-md sm:mx-auto">
            <GoogleSignInButton className="h-[46px] w-full justify-center rounded-[1.05rem] bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] text-[0.94rem] shadow-[0_8px_16px_rgba(23,52,93,0.14)] hover:brightness-105" label="登入" nextPath="/dashboard" />
          </div>

          {authState === "failed" ? (
            <div className="mx-auto mt-4 max-w-md rounded-[1.1rem] border border-danger/30 bg-danger/10 px-4 py-3 text-left text-sm leading-6 text-danger">
              <p>{authMessage ?? "登入失敗"}</p>
            </div>
          ) : null}

          <div className="animate-fade-up-delay-5 mt-3 sm:max-w-md sm:mx-auto">
            <LoginProductIntroModal triggerClassName="h-11 w-full justify-center rounded-[1.05rem] border-border/60 bg-card/88 text-[0.93rem]" />
          </div>
        </section>
      </div>
    </main>
  );
}