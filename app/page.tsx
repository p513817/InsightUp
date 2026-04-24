import { Activity, ArrowRight, ChartSpline, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-16 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
        <section className="space-y-8 rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-panel backdrop-blur lg:p-10">
          <Badge className="w-fit">InsightUp / InBody Tracker</Badge>
          <div className="space-y-5">
            <h1 className="font-display text-5xl leading-tight text-foreground sm:text-6xl">
              將 InBody 追蹤整理成真正能部署、維護、長期迭代的產品。
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              InsightUp 會保留你現在 demo 的核心規則，把 Google 登入、紀錄 CRUD、圖表分析、Fly.io 部署與本地開發工作流整合成一個乾淨的 Next.js 專案。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <GoogleSignInButton nextPath="/dashboard" />
            <Button asChild size="lg" variant="outline">
              <a href="#highlights">
                看重點設計
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3" id="highlights">
            <Card className="gap-3 bg-[#f7f0e3]">
              <Activity className="size-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">可靠紀錄管理</h2>
              <p className="text-sm leading-6 text-muted-foreground">保留 suspicious records，但可獨立排除出圖表分析。</p>
            </Card>
            <Card className="gap-3 bg-[#f7f0e3]">
              <ChartSpline className="size-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">單一主圖表視角</h2>
              <p className="text-sm leading-6 text-muted-foreground">整體與區域資料共用同一個圖表面板，切換更直接。</p>
            </Card>
            <Card className="gap-3 bg-[#f7f0e3]">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">環境變數驅動 OAuth</h2>
              <p className="text-sm leading-6 text-muted-foreground">不再手動來回改 redirect URL，只調整 `.env` 與 Supabase 允許清單。</p>
            </Card>
          </div>
        </section>

        <section className="rounded-[2rem] border border-foreground/10 bg-[#1d2a24] p-8 text-[#f7f2e8] shadow-panel lg:p-10">
          <p className="text-sm uppercase tracking-[0.24em] text-[#dfb283]">Product Direction</p>
          <div className="mt-6 space-y-5 text-sm leading-7 text-[#c9d1c6]">
            <p>這個版本已經改成單一 Fly.io 可部署的 Next.js App Router 專案，並用 Supabase SSR 處理登入與 session。</p>
            <p>前端 UI 會統一成同一組 card、button、form primitive，避免原始 demo 中散落在 HTML 與 JS 內的控制邏輯。</p>
            <p>文件會分成英文 Agent guide 與中文操作文件，讓未來的人與 agent 都能快速接手。</p>
          </div>
        </section>
      </div>
    </main>
  );
}