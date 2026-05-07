# InsightUp

InsightUp 是一個用來追蹤 InBody 指標的 Next.js 專案，支援 Google 登入、個人紀錄管理、整體與區域圖表分析，以及可控的 chart inclusion 流程。

## 目前版本重點

- 單一 Next.js App Router 專案，目前以 Vercel 作為正式部署目標
- Supabase Auth + Supabase 資料庫
- 可新增、編輯、刪除 InBody 紀錄
- 可將紀錄保留在歷史中，但排除出圖表分析
- 支援 AI 趨勢摘要，會先讀取最新摘要，再由使用者決定是否重新生成
- AI 使用次數與模型池由 Supabase entitlement 資料控制
- 中文 UI、英文 Agent 文件、中文操作文件
- 舊版靜態 demo 已歸檔到 `archive/legacy-demo/`

## 技術棧

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- Supabase SSR
- Recharts
- React Hook Form + Zod
- Vitest

## 快速開始

1. 安裝 Node 22。
2. 執行 `corepack enable`。
3. 執行 `corepack prepare pnpm@10.6.5 --activate`。
4. 複製 `.env.example` 成 `.env.local`。
5. 填入 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_SITE_URL`、`GEMINI_API_KEY`。
6. 在 Supabase 依序套用 `infra/supabase/migrations/20260422_001_init.sql`、`infra/supabase/migrations/20260424_001_dashboard_preferences.sql`、`infra/supabase/migrations/20260424_002_friends.sql`、`infra/supabase/migrations/20260506_001_llm_trend_daily_summaries.sql`、`infra/supabase/migrations/20260506_002_add_model_name_to_llm_trend_daily_summaries.sql`、`infra/supabase/migrations/20260506_003_llm_feature_entitlements.sql`。
7. 執行 `pnpm install`。
8. 執行 `pnpm dev`。
9. 開啟 `http://127.0.0.1:3000`。

## 常用指令

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## 文件導覽

- 中文本地開發與測試：`docs/human/local-development.md`
- 中文 OAuth 環境策略：`docs/human/oauth-environment-strategy.md`
- 中文 Vercel 部署：`docs/human/vercel-deployment.md`
- 中文產品使用說明：`docs/human/usage-guide.md`
- 英文 Agent 開發說明：`docs/agent/developer-guide.md`
- 英文架構總覽：`docs/agent/architecture.md`
- 英文 Supabase schema 說明：`docs/agent/supabase-schema.md`
- Supabase SQL 與 migration：`infra/supabase/`

## Supabase 與 OAuth

這個版本不再把 redirect URL 寫死在程式裡。

應用程式會用 `NEXT_PUBLIC_SITE_URL` 或目前來源網域組出 `/auth/callback`，所以開發與正式環境只需要：

- 在 `.env.local` / Vercel Environment Variables 設定對應的 site URL
- 在 Supabase Auth 的 Allowed Redirect URLs 加入本地與正式網域

## 部署摘要

目前正式部署建議使用 Vercel，至少需要設定：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `GEMINI_API_KEY`

`.env.example` 已包含目前開發與 Vercel 部署需要的基本環境變數範例。
