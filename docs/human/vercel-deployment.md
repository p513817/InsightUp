# Vercel 部署說明

InsightUp 目前以單一 Next.js App Router 專案部署到 Vercel。

## 部署前需求

- 已建立 Vercel 專案
- 已建立 Supabase 專案
- Supabase Auth Google Provider 已設定
- Supabase migrations 已依檔名順序套用
- 已取得 Gemini API key

## Vercel 專案設定

1. 在 Vercel 匯入 repository。
2. Framework Preset 使用 Next.js。
3. Build 與 Output 設定使用 Vercel 預設值即可。
4. 在 Project Settings -> Environment Variables 設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
GEMINI_API_KEY=your-gemini-api-key
```

如果正式網域不是 `vercel.app`，`NEXT_PUBLIC_SITE_URL` 請填正式網域，例如：

```env
NEXT_PUBLIC_SITE_URL=https://insightup.example.com
```

## Supabase 設定

Supabase Auth 的 Allowed Redirect URLs 至少需要包含：

- `http://127.0.0.1:3000/auth/callback`
- `http://localhost:3000/auth/callback`
- `https://your-app.vercel.app/auth/callback`
- 正式自訂網域的 `/auth/callback`

如果你在本機使用其他 port，例如 `5500`，也要加入對應 callback：

- `http://localhost:5500/auth/callback`

## 部署後 Smoke Test

部署後建議檢查：

1. Google 登入可成功回到 `/dashboard`。
2. Records 可新增、編輯、刪除。
3. 排除圖表後，該筆紀錄仍保留在歷史中，但不影響圖表。
4. Dashboard 可切換整體與部位圖表。
5. Dashboard 偏好設定重新整理後仍保留。
6. AI 趨勢摘要可以先讀最新摘要，並能在額度允許時重新生成。
7. AI Scan 可以取得額度狀態，並產生草稿。
8. Personal Goal 可顯示正向與負向進度。
9. Friends 可用好友代碼新增與查看比較。
10. Competitions 可建立、邀請、加入/婉拒、設定成員目標。
11. Account 可顯示目前方案。

## 常見問題

### Google 登入後沒有回到 Dashboard

請確認：

- `NEXT_PUBLIC_SITE_URL` 是目前部署網域。
- Supabase Allowed Redirect URLs 包含該網域的 `/auth/callback`。
- Google Provider 已在 Supabase Auth 啟用。

### AI 趨勢摘要或 AI Scan 失敗

請確認：

- `GEMINI_API_KEY` 已設定在 Vercel 對應環境。
- Supabase 已套用 AI entitlement 相關 migrations。
- `subscription_plans` 與 `plan_feature_entitlements` 有對應功能設定。
- Vercel Function logs 中沒有 provider quota 或 authentication error。

### Preview 部署登入失敗

Preview URL 每次可能不同。若要在 Preview 測 OAuth，請把對應 Preview callback 加到 Supabase Allowed Redirect URLs，或改用固定 Preview/custom domain。

### 未來 Email 或 Push 通知

目前還沒有實作通知。若之後加入：

- Email provider API key 應放在 Vercel Environment Variables。
- Web Push 需要 VAPID public/private key。
- 通知歷史應先存在 Supabase，Push/Email 只當投遞通道。
