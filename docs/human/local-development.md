# 本地開發與測試

這份文件給要在本機啟動 InsightUp 的人使用。後續 Agent 若需要快速理解目前專案狀態，請先看 `docs/agent/current-state.md`。

## 前置需求

- Node.js 22 LTS
- pnpm 10.6.5，建議透過 Corepack 啟用
- 一個可用的 Supabase 專案
- Gemini API key

## 本地啟動步驟

1. 在專案 root 執行 `corepack enable`。
2. 執行 `corepack prepare pnpm@10.6.5 --activate`。
3. 複製 `.env.example` 成 `.env.local`。
4. 填入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000`
   - `GEMINI_API_KEY`
5. 在 Supabase 依照檔名順序套用 `infra/supabase/migrations/` 內的 SQL。
6. 執行 `pnpm install`。
7. 執行 `pnpm dev`。
8. 用瀏覽器開啟 `http://127.0.0.1:3000`。

如果你改用其他 port，例如 `pnpm dev --port 5500`，請同步確認 OAuth 使用的 host 與 Supabase Allowed Redirect URLs 有包含對應 callback。

## Supabase SQL 順序

新 Supabase 專案請依照檔名順序套用 migrations。重點分組如下：

- `20260422_001_init.sql`：InBody 紀錄、部位資料、基礎 RLS
- `20260424_001_dashboard_preferences.sql`：Dashboard 偏好設定
- `20260424_002_friends.sql`、`20260424_003_friend_snapshot_deltas.sql`：好友與快照
- `20260506_001_llm_trend_daily_summaries.sql` 到 `20260506_003_llm_feature_entitlements.sql`：AI 趨勢摘要與方案權益
- `20260520_001_llm_daily_feature_usage.sql`：AI Scan 等每日功能使用量
- `20260605_001_friend_record_history.sql`、`20260605_002_friend_record_history_limited.sql`：好友歷史紀錄
- `20260608_001_user_personal_goals.sql` 到 `20260608_004_add_start_record_to_user_personal_goals.sql`：個人目標
- `20260609_001_competitions.sql` 與 `20260610_00*_*.sql`：競賽、成員、排行榜與 RPC 修正

不要只看 `infra/supabase/schema.sql` 判斷最新資料庫狀態；最新功能以 migrations 為準。

## 建議本地檢查

每次主要功能改完後，至少跑：

- `pnpm typecheck`
- 相關的 focused test，例如 `pnpm vitest run tests/competitions.test.ts`
- 範圍較大時再跑 `pnpm lint`

目前常用測試：

- `tests/inbody-records.test.ts`
- `tests/dashboard-preferences.test.ts`
- `tests/friends.test.ts`
- `tests/llms.test.ts`
- `tests/personal-goals.test.ts`
- `tests/inbody-progress.test.ts`
- `tests/competitions.test.ts`

## 手動 Smoke Test

建議檢查：

1. Google 登入後回到 `/dashboard`。
2. 可新增、編輯、刪除 InBody 紀錄。
3. 可把紀錄排除出圖表，但仍保留在歷史紀錄中。
4. Dashboard 可切換整體與各部位趨勢。
5. Dashboard 偏好設定重新整理後仍保留。
6. AI 趨勢摘要會先讀最新摘要，只有手動重新生成才消耗額度。
7. AI Scan 會產生草稿，不會直接寫入正式紀錄。
8. 個人目標可呈現正向、完成、負向進度。
9. 好友代碼新增、好友快照與好友比較可運作。
10. 競賽列表、詳情、建立/編輯、加入/婉拒與目標進度可運作。
11. Account 頁面可看到目前方案。

## 常見問題

### Dashboard 顯示找不到 `user_dashboard_preferences`

代表 `20260424_001_dashboard_preferences.sql` 還沒有套用到目前 Supabase 專案。

### AI Scan 或 AI 趨勢摘要沒有額度

請確認：

- `20260506_003_llm_feature_entitlements.sql` 已套用。
- `20260520_001_llm_daily_feature_usage.sql` 已套用。
- `subscription_plans` 與 `plan_feature_entitlements` 有對應功能設定。

### 競賽日期更新失敗

競賽目標日期會連動成員目標，後端已用 trigger 鎖住已建立的競賽目標日期。前端也應避免在編輯競賽時開放日期修改。
