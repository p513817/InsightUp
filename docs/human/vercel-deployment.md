# Vercel 部署說明

## 事前準備

- 已有 Vercel 帳號
- 已完成 Supabase 專案與 Google Auth 設定
- 已準備好 `GEMINI_API_KEY`

## 第一次部署

1. 在 Vercel 匯入這個 repository。
2. Framework Preset 使用 Next.js。
3. Build 與 Output 設定維持 Vercel 預設即可。
4. 在 Vercel Project Settings -> Environment Variables 設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
GEMINI_API_KEY=your-gemini-api-key
```

1. 觸發第一次部署。

## 更新部署

之後每次更新只要 push 到你設定的 branch，Vercel 就會自動重新部署。

如果你有分 Preview / Production，請確認 Production 環境變數完整，並讓 `NEXT_PUBLIC_SITE_URL` 指向主要正式網域。

## 部署後檢查

1. 開啟正式站台。
2. 測試 Google 登入。
3. 檢查 callback 是否回到 `/dashboard`。
4. 測試新增一筆紀錄。
5. 檢查圖表是否正確顯示 included records。
6. 打開 `AI 趨勢建議`，確認可讀取最新摘要並可手動重新生成。
7. 打開個人資訊頁，確認目前方案等級可正常顯示。

## 常見問題

### Google 登入後跳不回來

先檢查：

- `NEXT_PUBLIC_SITE_URL` 是否正確
- Supabase Allowed Redirect URLs 是否包含正式 callback
- Google Provider 是否已在 Supabase Auth 啟用

### Vercel 已部署但 AI 摘要失敗

先檢查：

- `GEMINI_API_KEY` 是否已正確設定在 Vercel
- Supabase migration 是否已套用到 `20260506_003_llm_feature_entitlements.sql`
- `subscription_plans` / `plan_feature_entitlements` 是否已有預設 `free` entitlement

### Preview 網址可以開，但登入失敗

先檢查：

- Supabase Allowed Redirect URLs 是否也加入你實際使用的 Preview callback
- 是否在測試時混用了不同 host
- `NEXT_PUBLIC_SITE_URL` 是否仍正確指向主要正式網域，而不是臨時 preview 網址
