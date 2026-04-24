# InsightUp

InsightUp 是一個用來追蹤 InBody 指標的 Next.js 專案，支援 Google 登入、個人紀錄管理、整體與區域圖表分析，以及可控的 chart inclusion 流程。

## 目前版本重點

- 單一 Next.js App Router 專案，可直接部署到 Fly.io
- Supabase Auth + Supabase 資料庫
- 可新增、編輯、刪除 InBody 紀錄
- 可將紀錄保留在歷史中，但排除出圖表分析
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
5. 填入 Supabase URL、anon key 與 `NEXT_PUBLIC_SITE_URL`。
6. 執行 `pnpm install`。
7. 執行 `pnpm dev`。
8. 開啟 `http://127.0.0.1:3000`。

## 常用指令

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## 文件導覽

- 中文本地開發與測試：`docs/human/local-development.md`
- 中文 OAuth 環境策略：`docs/human/oauth-environment-strategy.md`
- 中文 Fly.io 部署：`docs/human/fly-deployment.md`
- 中文產品使用說明：`docs/human/usage-guide.md`
- 英文 Agent 開發說明：`docs/agent/developer-guide.md`
- 英文架構總覽：`docs/agent/architecture.md`
- 英文 Supabase schema 說明：`docs/agent/supabase-schema.md`
- Supabase SQL 與 migration：`infra/supabase/`

## Supabase 與 OAuth

這個版本不再把 redirect URL 寫死在程式裡。

應用程式會用 `NEXT_PUBLIC_SITE_URL` 或目前來源網域組出 `/auth/callback`，所以開發與正式環境只需要：

- 在 `.env.local` / Fly secrets 設定對應的 site URL
- 在 Supabase Auth 的 Allowed Redirect URLs 加入本地與正式網域

## 部署摘要

專案已包含：

- `Dockerfile`
- `fly.toml`
- `output: "standalone"` 的 Next.js 設定

第一次部署前，記得把 `fly.toml` 內的 `app` 名稱改成你自己的 Fly app 名稱。
