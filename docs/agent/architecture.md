# Architecture

This document describes the current deployable architecture for InsightUp.

## Runtime Shape

InsightUp runs as one Next.js App Router service deployed to Vercel.

The app intentionally remains a single deployable unit. Route handlers under `app/api/*` are the natural extraction boundary if a separate API service is introduced later.

## Layers

### App Router

`app/` contains:

- public landing page at `app/page.tsx`
- product intro modal and landing illustration wiring through `components/auth/login-product-intro-modal.tsx` and `public/landing-user-problem.png`
- protected app shell under `app/(app)/`
- dashboard, records, personal goals, friends, competitions, share, summary, profile, and account pages
- route handlers under `app/api/*`
- OAuth callback under `app/auth/callback`

### Feature Components

`components/` contains:

- shared UI primitives in `components/ui/`
- navigation and auth components
- chart rendering and AI trend summary UI
- record create/edit and record manager components
- personal goal workspaces and forms
- friend list, comparison, and invite components
- competition list, detail, create/edit, membership, and goal flows

### Domain Logic

`lib/` contains framework-light logic and data adapters:

- `lib/inbody/*`: record types, validation, mapping, progress rules, chart assembly, AI scan parsing, and trend summary prompt assembly
- `lib/llms/*`: provider abstraction, Gemini integration, model rotation, entitlement parsing, and daily usage helpers
- `lib/friends/*`: friend code normalization, profile upsert, snapshots, and friend history
- `lib/personal-goals.ts`: goal schemas, progress calculation, CRUD helpers, and record selection rules
- `lib/competitions.ts`: competition schemas, RPC wrappers, row grouping, leaderboard sorting, and current-user member attachment
- `lib/dashboard-preferences.ts`: persisted chart layout and metric preference helpers
- `lib/auth/redirects.ts`: auth redirect target sanitization shared by the OAuth callback
- `lib/supabase/*`: browser singleton, server client, and middleware cookie refresh
- `lib/i18n*`: locale selection and translation helpers

## Auth Flow

1. The public page triggers Supabase Google OAuth.
2. Redirects target `/auth/callback`, using `NEXT_PUBLIC_SITE_URL` or the current request origin.
3. The callback route exchanges the code for a Supabase session.
4. Callback `next` targets are restricted to same-origin paths; protocol-relative targets fall back to `/dashboard`.
5. Middleware refreshes session cookies.
6. Protected pages and route handlers read the user with the server Supabase client.
7. Unauthenticated users are redirected to the visible login surface or receive `401` JSON from APIs.

## API Surface

Current route handlers include:

- `GET /api/me`
- `GET /api/records`
- `POST /api/records`
- `PATCH /api/records/:recordId`
- `DELETE /api/records/:recordId`
- `GET /api/records/scan`
- `POST /api/records/scan`
- `GET /api/chart-data?view=overall|leftArm|rightArm|trunk|leftLeg|rightLeg`
- `PATCH /api/preferences/dashboard`
- `GET /api/trend-summary`
- `POST /api/trend-summary`
- `GET /api/personal-goals`
- `POST /api/personal-goals`
- `PATCH /api/personal-goals/:goalId`
- `DELETE /api/personal-goals/:goalId`
- `GET /api/friends`
- `POST /api/friends`
- `DELETE /api/friends/:friendUserId`
- `POST /api/test-auth/start`
- `POST /api/test-auth/reset`
- `POST /api/test-auth/login`
- `GET /api/competitions`
- `POST /api/competitions`
- `PATCH /api/competitions/:competitionId`
- `DELETE /api/competitions/:competitionId`
- `POST /api/competitions/:competitionId/goals`
- `PATCH /api/competitions/:competitionId/membership`

Some dynamic route files may not show method exports through simple shell globbing on Windows because folder names contain brackets. Inspect the actual files when editing those APIs.

## Data Model

Database rollout is migration-driven from `infra/supabase/migrations/`.

Core tables and concepts:

- `inbody_records`: user-owned measurement events, soft deletion, chart inclusion, scan metadata
- `inbody_segments`: per-body-part segment values
- `user_dashboard_preferences`: dashboard layout and metric order
- `user_profiles`: display name, avatar URL, and friend code
- `user_friendships`: directed friendship links
- `llm_trend_daily_summaries`: latest generated trend summary per user, feature, and local date
- `llm_daily_feature_usage`: daily usage accounting for feature-specific LLM flows such as scan
- `subscription_plans`, `plan_feature_entitlements`, `user_subscriptions`: plan-driven feature limits/config
- `user_personal_goals`: standalone goals and competition-linked goals
- `competitions`, `competition_members`: competition container and participant state

Important RPCs:

- `resolve_my_feature_entitlement`
- `list_friend_latest_records`
- `list_friend_records_history`
- `create_competition_with_members`
- `update_competition_with_members`
- `delete_competition_with_members`
- `list_my_competitions_with_progress`

## Chart And Progress Model

The dashboard renders one primary chart panel that switches between overall and segmental views.

Only included, non-deleted records should participate in charts.

Goal progress supports:

- positive progress toward a target
- over-target completion
- negative progress when a metric moves away from the goal
- zero-change targets, where any deviation is regression

Metric direction rules live in `lib/inbody/progress.ts`:

- lower is better: weight, fat, fatPercent, visceralFatLevel, fatRatio
- higher is better: muscle, score, bmr, recommendedCalories, muscleRatio

## AI Flows

### Trend Summary

- `GET /api/trend-summary` fetches the latest available summary and current same-day usage state.
- `POST /api/trend-summary` explicitly regenerates a summary if entitlement limits allow it.
- Prompt compaction lives in `lib/inbody/trend-summary.ts`.
- Provider/model metadata should remain available in responses.

### AI Scan

- `GET /api/records/scan` returns entitlement and usage state.
- `POST /api/records/scan` accepts JPG, PNG, WebP, or PDF files up to 10 MB and rejects oversized multipart requests before parsing when `content-length` proves they are too large.
- Scan uses Gemini through the LLM abstraction.
- The response is a draft record plus uncertainty metadata; saving the draft is a separate user-confirmed record creation flow.

## Deployment Notes

- Production target is Vercel.
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY`.
- Local development uses `http://localhost:5500` for `NEXT_PUBLIC_SITE_URL` and `pnpm dev`; Google OAuth redirect configuration depends on that origin.
- OAuth redirect URLs must include local and production `/auth/callback` URLs in Supabase.
- Keep route handlers compatible with Vercel serverless execution.

## Future Extension Path

### Separate API Service

If the product later requires separate services:

- move `app/api/*` handlers first
- keep `lib/inbody/*`, `lib/llms/*`, `lib/friends/*`, `lib/personal-goals.ts`, and `lib/competitions.ts` as shared or API-layer logic
- preserve client fetch contracts during the extraction

### Realtime And Notifications

The likely future notification model:

- in-app notification history table
- Web Push subscription table
- Supabase Realtime subscriptions for visible-page updates
- server-side fan-out for invited/joined/declined/new-record events
- optional transactional email provider for fallback or summaries
