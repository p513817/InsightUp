import Image from "next/image";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginProductIntroModal } from "@/components/auth/login-product-intro-modal";
import { Button } from "@/components/ui/button";
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
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      <section className="matte-panel brand-grid-lines relative w-full overflow-hidden rounded-[2rem] border border-border/70 px-4 py-6 shadow-panel sm:rounded-[2.25rem] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="brand-motion-line brand-motion-line-left" />
        <div className="brand-motion-line brand-motion-line-right" />

        <div className="relative z-10 mx-auto max-w-3xl space-y-8 text-center sm:space-y-9">
          <div className="mx-auto inline-flex items-center gap-4 rounded-full border border-white/60 bg-white/72 px-4 py-3 shadow-[0_10px_22px_rgba(16,35,63,0.06)] sm:px-5">
            <Image alt="InsightUp" className="size-12 rounded-full sm:size-14" height={56} priority src="/insightup-logo-rmbg.png" width={56} />
            <div className="text-left">
              <p className="font-display text-3xl leading-none text-foreground sm:text-4xl">InsightUp</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">InBody tracker</p>
            </div>
          </div>

          <div className="space-y-5">
            <p className="brand-kicker justify-center">See deeper. Move upward.</p>
            <h1 className="mx-auto max-w-3xl font-display text-4xl leading-[1.06] text-foreground sm:text-5xl lg:text-6xl">
              看見變化，判斷下一步。
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              InsightUp 讓 InBody 紀錄變成更容易讀懂的趨勢畫面，把日常數據整理成真正能支持判斷的洞見。
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <GoogleSignInButton nextPath="/dashboard" />
            <LoginProductIntroModal />
          </div>

          <div className="grid gap-3 text-left sm:grid-cols-3" id="why-insightup">
            <div className="rounded-[1.35rem] border border-white/70 bg-white/80 p-4 shadow-[0_8px_18px_rgba(16,35,63,0.05)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Insight</p>
              <p className="mt-3 font-display text-2xl text-foreground">單指標聚焦</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">每張卡片只處理一個 metric，趨勢判讀更快。</p>
            </div>
            <div className="rounded-[1.35rem] border border-white/70 bg-white/80 p-4 shadow-[0_8px_18px_rgba(16,35,63,0.05)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Flow</p>
              <p className="mt-3 font-display text-2xl text-foreground">Dashboard / Profile 分工</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">前者專注讀趨勢，後者專注整理資料與納入規則。</p>
            </div>
            <div className="rounded-[1.35rem] border border-white/70 bg-white/80 p-4 shadow-[0_8px_18px_rgba(16,35,63,0.05)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
              <p className="mt-3 font-display text-2xl text-foreground">保留歷史脈絡</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">排除圖表分析不等於刪除紀錄，資料仍然完整保存。</p>
            </div>
          </div>

          {authState === "failed" ? (
            <div className="mx-auto max-w-xl rounded-[1.25rem] border border-[rgba(184,91,115,0.32)] bg-[rgba(184,91,115,0.10)] px-4 py-3 text-left text-sm leading-6 text-[#7d4158]">
              <p>{authMessage ?? "登入失敗"}</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}