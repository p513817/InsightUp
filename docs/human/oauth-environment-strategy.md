# Google OAuth 環境切換策略

## 目標

避免開發時把 redirect URL 寫成 localhost，部署時再手動改回正式網址。這種方式容易漏改，也容易造成 Supabase callback 出錯。

## 目前採用的做法

應用程式永遠只導向：

- `/auth/callback`

完整 callback URL 由以下規則組出：

1. 優先使用 `NEXT_PUBLIC_SITE_URL`
2. 如果沒有明確設定，退回目前頁面的 origin

## 建議設定

### 本地開發

`.env.local`

```env
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

### Fly.io 正式環境

Fly secret 或 deploy env

```env
NEXT_PUBLIC_SITE_URL=https://your-app.fly.dev
```

## Supabase Allowed Redirect URLs

請同時把這些網址加進 Supabase Auth 設定：

- `http://127.0.0.1:3000/auth/callback`
- `http://localhost:3000/auth/callback`
- `https://your-app.fly.dev/auth/callback`
- 你的自訂網域 callback，如果有的話

## 為什麼這樣比較好

- 不需要因為環境切換去改程式碼
- redirect 規則集中在環境變數與 Supabase 後台
- 本地與正式環境可同時存在，不互相覆蓋
- 對 agent 與團隊成員都比較容易理解
