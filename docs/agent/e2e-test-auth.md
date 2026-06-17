# E2E Test Auth And Personas

Use this document when implementing or running authenticated local/Preview tests without Google OAuth.

## Purpose

InsightUp uses Google OAuth for real users, but E2E tests should not automate the Google login UI. The app provides protected test-only endpoints for fixed personas and resettable seed scenarios:

- `GET /test-auth`
- `POST /api/test-auth/reset`
- `POST /api/test-auth/login`

The implementation lives in:

- `app/test-auth/page.tsx`
- `components/test-auth/test-auth-panel.tsx`
- `app/api/test-auth/login/route.ts`
- `app/api/test-auth/reset/route.ts`
- `app/api/test-auth/_shared.ts`
- `lib/test-auth/personas.ts`
- `lib/test-auth/supabase.ts`

## Safety Model

Test auth is allowed only when all conditions are true:

- `VERCEL_ENV !== "production"`
- If `VERCEL_ENV` is absent, `NODE_ENV !== "production"`
- `E2E_TEST_AUTH_ENABLED=true`
- `E2E_TEST_AUTH_SECRET` is set
- `SUPABASE_SERVICE_ROLE_KEY` is set
- Request header `x-e2e-test-auth-secret` exactly matches `E2E_TEST_AUTH_SECRET`

Production returns `404` even if someone accidentally sets the feature flag.

Do not accept arbitrary emails or user IDs in request bodies. Only persona keys defined in `E2E_PERSONAS` are valid.

Never pass `E2E_TEST_AUTH_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` from server code into client props. The `/test-auth` page asks the user to paste the local secret and only sends it as the `x-e2e-test-auth-secret` request header.

## Personas

Defined in `lib/test-auth/personas.ts`:

- `alice` / Mia Chen: rich primary user, free plan, 13 records in rich scenarios, including 12 chart-included records and 1 excluded travel-week record.
- `bob` / Ryan Lin: friend/comparison target, E2E Pro plan, 6 records with a stronger muscle/pro-plan profile.
- `empty` / No Data User: profile-only user for empty-state screens, 0 records.
- `competitor` / Nora Wu: competition participant for competition flows, 4 records.

Each persona has a fixed SVG data-url avatar stored in Auth metadata and `user_profiles.avatar_url`.

All test emails must end in `@insightup.test`.

## Scenarios

Defined in `lib/test-auth/personas.ts`:

- `dashboard-rich`: Alice has 13 records, goals, Bob as friend, a competition, competitor data, and cached trend summary.
- `friends-ready`: Alice and Bob are already linked.
- `friend-add-flow`: Alice and Bob exist but are not linked; use Bob's friend code to test adding friends.
- `empty-state`: Empty persona has profile/subscription only.

The human-facing `/test-auth` UI must expose bound test cases, not independent scenario/persona controls:

- `Rich dashboard`: `dashboard-rich` + `alice`
- `Friends ready`: `friends-ready` + `alice`
- `Add friend flow`: `friend-add-flow` + `alice`
- `Empty state`: `empty-state` + `empty`
- `Bob perspective`: `dashboard-rich` + `bob`

Keep scenario and persona separate only at the API/script layer for automated or advanced checks.

## Manual API Usage

For local human testing, prefer the browser page:

```text
http://localhost:5500/test-auth
```

Use the API directly for scripted tests. Use the secret from `.env.local`.

Reset:

```powershell
$headers = @{ "x-e2e-test-auth-secret" = "<E2E_TEST_AUTH_SECRET>" }
Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/test-auth/reset" -Headers $headers -ContentType "application/json" -Body '{"scenario":"dashboard-rich"}'
```

Login:

```powershell
$headers = @{ "x-e2e-test-auth-secret" = "<E2E_TEST_AUTH_SECRET>" }
Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/test-auth/login" -Headers $headers -ContentType "application/json" -Body '{"persona":"alice","next":"/dashboard"}' -SessionVariable webSession
```

Browser-oriented tests should call these endpoints through the test runner's request context so response cookies are retained before navigating.

## Adding A Persona

1. Add the persona to `E2E_PERSONAS` with a fixed UUID, fixed `@insightup.test` email, display name, friend code, and plan.
2. Add seed data in `lib/test-auth/supabase.ts` only if a scenario needs it.
3. Keep reset cleanup scoped to known persona IDs.
4. Add or update tests in `tests/test-auth.test.ts`.
5. Update this document.

## Validation

Run:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm typecheck'
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm test'
```

If `SUPABASE_SERVICE_ROLE_KEY` is available locally, also run:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm test-auth:smoke'
```

Use optional arguments when targeting a different scenario or persona:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm test-auth:smoke -- --scenario=friend-add-flow --persona=alice'
```

To verify the friend-add flow end to end, run:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'cd /d/personal/InsightUp && load_nvm && pnpm test-auth:smoke -- --scenario=friend-add-flow --persona=alice --assertFriendAdd=true'
```
