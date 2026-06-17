# 本機測試登入與測試使用者

InsightUp 正式使用者仍然走 Google Login。為了本機與 Preview 測試，不建議自動化 Google OAuth 畫面；測試時改用固定的 E2E persona，讓你可以快速切換不同使用者狀態。

## 安全規則

測試登入只會在下列條件都成立時啟用：

- 不是 Vercel Production：`VERCEL_ENV !== "production"`
- 沒有 `VERCEL_ENV` 時，`NODE_ENV` 也不能是 `production`
- `E2E_TEST_AUTH_ENABLED=true`
- `E2E_TEST_AUTH_SECRET` 有設定
- `SUPABASE_SERVICE_ROLE_KEY` 有設定
- API request header `x-e2e-test-auth-secret` 必須完全等於 `E2E_TEST_AUTH_SECRET`

Production 會直接回 `404`。即使不小心在 Vercel Production 設了 `E2E_TEST_AUTH_ENABLED=true`，測試登入入口也不會開啟。

## `.env.local`

本機 `.env.local` 需要：

```env
E2E_TEST_AUTH_ENABLED=true
E2E_TEST_AUTH_SECRET=<一組夠長的本機密鑰>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
```

注意：

- `SUPABASE_SERVICE_ROLE_KEY` 從 Supabase Project Settings -> API Keys 複製。
- 不可以把 `SUPABASE_SERVICE_ROLE_KEY` 改成 `NEXT_PUBLIC_` 開頭。
- `.env.local` 已被 `.gitignore` 忽略，不會 commit。
- Vercel Production 不要設定 `E2E_TEST_AUTH_ENABLED=true`。

## 圖形操作入口

啟動本機 dev server 後，打開：

```text
http://localhost:5500/test-auth
```

操作順序：

1. 貼上 `.env.local` 裡的 `E2E_TEST_AUTH_SECRET`。
2. 選擇一個測試案例。
3. 按「重置並登入」。

測試案例會把 seed scenario、登入使用者與登入後頁面綁在一起；手動測試時不要自由混搭 `empty-state + alice` 這類進階組合。

如果頁面顯示缺少 `SUPABASE_SERVICE_ROLE_KEY`，請先補 `.env.local`，再重啟 dev server。

## 測試使用者

目前固定 persona：

- `alice` / Mia Chen：主要測試使用者。rich 情境中有 13 筆 InBody 紀錄，其中 12 筆納入圖表、1 筆排除圖表，並有目標、好友、競賽與 AI summary cache。
- `bob` / Ryan Lin：好友與比較用使用者，使用 `e2e_pro` 方案，有 6 筆偏增肌取向的紀錄。
- `empty` / No Data User：只有 profile 與 subscription，沒有紀錄，用來看空狀態。
- `competitor` / Nora Wu：競賽參與者，有 4 筆競賽對照用紀錄。

每個 persona 都會 seed 固定大頭貼，寫入 Auth metadata 與 `user_profiles.avatar_url`。

所有測試 email 都必須是 `@insightup.test`，避免誤用真實使用者。

## 測試情境

目前固定 scenario：

- `dashboard-rich`：Alice 有 13 筆紀錄、目標、Bob 好友、競賽、競賽對手資料與快取 AI 摘要。
- `friends-ready`：Alice 和 Bob 已經是好友。
- `friend-add-flow`：Alice 和 Bob 都存在，但尚未加好友，可測新增好友。
- `empty-state`：Empty persona 只有 profile 與 subscription。

`/test-auth` UI 會用測試案例包裝這些底層 scenario：

- `Rich dashboard`：`dashboard-rich` + `alice`
- `Friends ready`：`friends-ready` + `alice`
- `Add friend flow`：`friend-add-flow` + `alice`
- `Empty state`：`empty-state` + `empty`
- `Bob perspective`：`dashboard-rich` + `bob`

## 好友新增測試

使用 `friend-add-flow`：

1. 在 `/test-auth` reset `friend-add-flow`。
2. 登入 `alice`。
3. 前往 `/friends`。
4. 輸入 Bob 的好友 ID：`E2EBOB001A`。
5. 確認 Bob 被加入好友清單，並可查看或比較資料。

## API 操作

如果不使用 `/test-auth` 頁面，也可以在 PowerShell 操作。

Reset：

```powershell
$headers = @{ "x-e2e-test-auth-secret" = "<E2E_TEST_AUTH_SECRET>" }
Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/test-auth/reset" -Headers $headers -ContentType "application/json" -Body '{"scenario":"dashboard-rich"}'
```

Login：

```powershell
$headers = @{ "x-e2e-test-auth-secret" = "<E2E_TEST_AUTH_SECRET>" }
Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/test-auth/login" -Headers $headers -ContentType "application/json" -Body '{"persona":"alice","next":"/dashboard"}' -SessionVariable webSession
```

Playwright 或其他瀏覽器測試應使用 test runner 的 request context 呼叫 reset/login，保留 response cookie 後再前往 `/dashboard`、`/friends` 或其他頁面。

## 新增測試使用者流程

如果要新增 persona：

1. 修改 `lib/test-auth/personas.ts`。
2. 在 `E2E_PERSONAS` 新增固定資料：
   - 固定 UUID
   - `@insightup.test` email
   - display name
   - friend code
   - plan code
3. 如果該 persona 需要資料，修改 `lib/test-auth/supabase.ts` 加入 seed 函式。
4. 如果需要新情境，修改 `E2E_SCENARIOS`。
5. 更新 `tests/test-auth.test.ts`。
6. 更新 `docs/agent/e2e-test-auth.md` 與本文件。

不要讓 request body 接受任意 email 或 user id。測試登入只能使用白名單 persona key。

## 驗證

每次修改測試登入邏輯後，執行：

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm typecheck'
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm test'
```

如果本機已設定 `SUPABASE_SERVICE_ROLE_KEY`，再手動驗證：

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm test-auth:smoke'
```

也可以指定情境與使用者：

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm test-auth:smoke -- --scenario=friend-add-flow --persona=alice'
```

如果要一起驗證「新增好友」API：

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm test-auth:smoke -- --scenario=friend-add-flow --persona=alice --assertFriendAdd=true'
```

最後再手動確認：

1. `/test-auth` 可以 reset scenario。
2. 可以登入 `alice`、`bob`、`empty`。
3. `friend-add-flow` 可以正常新增 Bob。
4. Production 或 `NODE_ENV=production` 下測試入口回 `404`。
