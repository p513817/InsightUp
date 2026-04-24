import Image from "next/image";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-16 lg:px-10">
      <section className="w-full space-y-8 rounded-[2rem] border border-border/70 bg-card/90 p-8 text-center shadow-panel backdrop-blur lg:p-12">
        <div className="flex justify-center">
          <Image
            alt="InsightUp"
            className="h-auto w-full max-w-[220px]"
            height={220}
            priority
            src="/insightup-logo-rmbg.png"
            width={220}
          />
        </div>

        <div className="space-y-4">
          <h1 className="font-display text-5xl leading-tight text-foreground sm:text-6xl">InsightUp</h1>
          <p className="mx-auto max-w-2xl text-base leading-8 text-muted-foreground">
            集中追蹤 InBody 指數變化，快速查看每個指數的趨勢，並保留完整歷史紀錄。
          </p>
          <p className="mx-auto max-w-2xl text-base leading-8 text-muted-foreground">
            Dashboard 專注閱讀圖表，Profile 專注管理多筆資料與 Include/Exclude 狀態。
          </p>
        </div>

        <div className="flex justify-center">
          <GoogleSignInButton nextPath="/dashboard" />
        </div>

        {authState === "failed" ? (
          <div className="rounded-2xl border border-[#d98a63] bg-[#fff1e7] px-4 py-3 text-sm leading-6 text-[#7a3418]">
            <p>{authMessage ?? "登入失敗"}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}