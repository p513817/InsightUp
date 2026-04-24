# Fly.io 部署說明

## 事前準備

- 安裝 `flyctl`
- 可登入 Fly.io 帳號
- 已完成 Supabase 專案與 Google Auth 設定

## 第一次部署

1. 在專案 root 操作。
2. 打開 `fly.toml`，把 `app = "insightup-your-fly-app"` 改成你自己的唯一名稱。
3. 設定 secrets：

```bash
fly secrets set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
fly secrets set NEXT_PUBLIC_SITE_URL=https://your-app.fly.dev
```

1. 執行部署：

```bash
fly deploy
```

## 更新部署

之後每次更新只要在專案 root 執行：

```bash
fly deploy
```

## 部署後檢查

1. 開啟 `https://your-app.fly.dev`
2. 測試 Google 登入
3. 檢查 callback 是否回到 `/dashboard`
4. 測試新增一筆紀錄
5. 檢查圖表是否正確顯示 included records

## 常見問題

### Google 登入後跳不回來

先檢查：

- `NEXT_PUBLIC_SITE_URL` 是否正確
- Supabase Allowed Redirect URLs 是否包含正式 callback
- Google Provider 是否已在 Supabase Auth 啟用

### Fly 已部署但畫面空白

先檢查：

- Fly secrets 是否都有設
- Supabase URL / anon key 是否填錯
- 應用程式是否成功 build
