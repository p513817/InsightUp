"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function LoginProductIntroModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          產品介紹
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto rounded-[1.75rem] p-0 sm:rounded-[2rem]">
        <DialogHeader className="border-b border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f3f8fc_100%)] px-5 py-5 sm:px-8 sm:py-6">
          <DialogTitle>InsightUp 產品介紹</DialogTitle>
          <DialogDescription>
            把 InBody 紀錄整理成可判讀的趨勢畫面，協助你快速讀懂變化、保留脈絡，並建立更穩定的追蹤習慣。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-5 py-5 sm:px-8 sm:py-7">
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.35rem] border border-border/70 bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8fc_100%)] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Insight</p>
              <p className="mt-3 font-display text-2xl text-foreground">快速看懂變化</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Dashboard 讓每張卡片只承擔一個指標，避免資訊混在一起，讓趨勢更容易閱讀。
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8fc_100%)] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Control</p>
              <p className="mt-3 font-display text-2xl text-foreground">管理資料脈絡</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Records 集中處理新增、編輯與納入圖表規則，讓資料整理與趨勢閱讀清楚分工。
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8fc_100%)] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
              <p className="mt-3 font-display text-2xl text-foreground">保留每次上升證據</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                排除圖表分析不等於刪除紀錄，完整歷史仍會保留，方便你回頭比對與判斷。
              </p>
            </div>
          </section>

          <section className="grid gap-4 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f5f9fc_100%)] p-5 md:grid-cols-[0.95fr_1.05fr] md:p-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">How It Works</p>
              <h3 className="font-display text-3xl text-foreground">從紀錄到判斷，流程保持單純。</h3>
              <p className="text-sm leading-7 text-muted-foreground">
                先用 Records 整理 InBody 紀錄，再進到 Dashboard 觀察趨勢。兩個頁面分工明確，能降低理解成本，也更符合日常使用節奏。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              <div className="rounded-[1.1rem] border border-border/70 bg-white/88 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Step 1</p>
                <p className="mt-1 font-medium text-foreground">新增或更新紀錄</p>
              </div>
              <div className="rounded-[1.1rem] border border-border/70 bg-white/88 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Step 2</p>
                <p className="mt-1 font-medium text-foreground">決定哪些資料納入分析</p>
              </div>
              <div className="rounded-[1.1rem] border border-border/70 bg-white/88 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Step 3</p>
                <p className="mt-1 font-medium text-foreground">在 Dashboard 讀取趨勢</p>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}