# Google OAuth 環境策略

InsightUp 使用 Supabase Auth 的 Google OAuth。重點是：callback URL 必須和瀏覽器實際開啟的 host 一致，否則 PKCE cookie 與 redirect host 可能對不上。

## 固定 Callback Path

專案只使用這個 callback path：

```text
/auth/callback
```

完整 callback URL 由環境與目前 origin 組合，不應在程式碼中寫死 localhost 或 production domain。

## 本地開發

`.env.local` 建議：

```env
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

如果你用 `localhost` 開啟，就使用：

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

如果你啟動在不同 port，例如：

```bash
pnpm dev --port 5500
```

就要確認 Supabase Allowed Redirect URLs 有：

```text
http://localhost:5500/auth/callback
```

## Vercel Production

Vercel Environment Variables：

```env
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

若使用正式自訂網域，請填正式網域：

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

## Supabase Allowed Redirect URLs

建議至少加入：

- `http://127.0.0.1:3000/auth/callback`
- `http://localhost:3000/auth/callback`
- `http://localhost:5500/auth/callback`，如果本機常用 5500
- `https://your-app.vercel.app/auth/callback`
- `https://your-domain.example/auth/callback`，如果有正式網域

## 除錯方向

登入失敗時先檢查：

- 目前瀏覽器網址的 host 是否和 `NEXT_PUBLIC_SITE_URL` 一致。
- Supabase Allowed Redirect URLs 是否包含目前 host 的 `/auth/callback`。
- Google Provider 是否在 Supabase Auth 中啟用。
- Browser cookie 是否被阻擋。
- Server route 是否有讀到 Supabase session。

避免在程式碼中為了修 login 而寫死某個 domain。這會讓 Preview、本地與正式環境互相干擾。
