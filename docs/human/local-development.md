# 本地開發與測試

## 前置需求

- Node.js 22 LTS
- pnpm（建議透過 Corepack 啟用）
- 一個可用的 Supabase 專案

## 本地啟動步驟

1. 在專案 root 執行 `corepack enable`。
2. 在專案 root 執行 `corepack prepare pnpm@10.6.5 --activate`。
3. 在專案 root 複製 `.env.example` 成 `.env.local`。
4. 填入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000`
5. 執行 `pnpm install`。
6. 執行 `pnpm dev`。
7. 用瀏覽器開啟 `http://127.0.0.1:3000`。

## 建議本地測試流程

每次改完主要功能後，至少跑一次：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

如果要做手動 smoke test，請檢查：

1. Google 登入能成功回到 `/dashboard`。
2. 可新增一筆記錄。
3. 可編輯既有記錄。
4. 可把記錄排除出圖表，但仍留在記錄清單。
5. 可刪除記錄，並從主畫面隱藏。
6. 圖表可切換 `Overall` 與各部位視角。

## Supabase SQL

如果是新的 Supabase 專案，先套用：

- `infra/supabase/migrations/20260422_001_init.sql`

如果你要理解欄位與 RLS 設計，再看：

- `docs/agent/supabase-schema.md`
