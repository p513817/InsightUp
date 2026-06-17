# Current State For Agents

This is the fastest handoff file for future agents. Read this before scanning the full repository.

## Runtime

- One deployable Next.js App Router app at the repository root.
- Production target is Vercel.
- Database/auth/storage boundary is Supabase.
- User-facing language is Traditional Chinese through `messages/zh-Hant.json`; English strings live in `messages/en.json`.
- Agent docs are English; human docs are Traditional Chinese.

## Core Product Invariants

- Records can be excluded from charts without being deleted.
- Deletion is soft by default through `deleted_at`.
- Dashboard charts must only use records where `is_included_in_charts = true` and `deleted_at is null`.
- AI trend summary fetch and explicit regeneration are separate flows.
- AI and scan usage limits come from database entitlements, not hardcoded user/email bypasses.
- AI scan remains review-first: generate a draft, let the user confirm, then save.
- Competition goal target dates are locked to the competition target date.
- OAuth callback URLs must stay environment-driven.

## High-Value Entry Points

- Records: `app/api/records/*`, `components/records/*`, `lib/inbody/records.ts`, `lib/inbody/schema.ts`
- Dashboard charts: `app/api/chart-data/route.ts`, `components/charts/*`, `components/workspace/records-workspace.tsx`
- Dashboard preferences: `app/api/preferences/dashboard/route.ts`, `lib/dashboard-preferences.ts`
- AI trend summary: `app/api/trend-summary/route.ts`, `lib/inbody/trend-summary.ts`, `lib/inbody/trend-summary-service.ts`, `lib/llms/*`
- AI scan: `app/api/records/scan/route.ts`, `lib/inbody/scan.ts`, `lib/llms/usage.ts`
- Personal goals: `app/api/personal-goals/*`, `components/personal-goals/*`, `lib/personal-goals.ts`
- Shared goal UI: `components/ui/goal-progress-bar.tsx`, `components/ui/goal-metric-progress-card.tsx`
- Friends: `app/api/friends/*`, `components/friends/*`, `lib/friends/*`
- Competitions: `app/api/competitions/*`, `components/competitions/*`, `lib/competitions.ts`
- Auth/session: `lib/supabase/*`, `middleware.ts`, `app/auth/callback/route.ts`
- E2E test auth/personas: `docs/agent/e2e-test-auth.md`, `app/test-auth/page.tsx`, `components/test-auth/*`, `app/api/test-auth/*`, `lib/test-auth/*`
- i18n: `components/i18n-provider.tsx`, `lib/i18n.ts`, `lib/i18n/server.ts`, `messages/*.json`

## Database Truth

Apply migrations in filename order from `infra/supabase/migrations/`.

Do not assume `infra/supabase/schema.sql` is a complete latest dump. It is useful context, but the newer feature set is represented by migrations:

- dashboard preferences: `20260424_001_dashboard_preferences.sql`
- friends: `20260424_002_friends.sql`, `20260424_003_friend_snapshot_deltas.sql`, `20260605_00*_friend_record_history*.sql`
- AI summaries and entitlements: `20260506_00*_*.sql`
- daily AI feature usage: `20260520_001_llm_daily_feature_usage.sql`
- personal goals: `20260608_00*_*.sql`
- competitions: `20260609_001_competitions.sql`, `20260610_00*_*.sql`

## Current Tests

Focused Vitest files:

- `tests/inbody-records.test.ts`
- `tests/dashboard-preferences.test.ts`
- `tests/friends.test.ts`
- `tests/llms.test.ts`
- `tests/personal-goals.test.ts`
- `tests/inbody-progress.test.ts`
- `tests/competitions.test.ts`
- `tests/test-auth.test.ts`

Default validation after meaningful code changes:

- `pnpm typecheck`
- focused `pnpm vitest run <test-file>`
- `pnpm lint` when the change is broad or before a release/PR

## UI Rules That Prevent Rework

- Use existing UI primitives in `components/ui/`.
- Keep mobile tappable targets at least 44px, with adjacent controls spaced by at least 8px.
- Use `BottomActionDock` and floating action helpers instead of inventing new fixed action bars.
- For goal progress, use shared progress components so personal goals and competition dialogs stay visually aligned.
- Keep negative progress visible but not visually alarming unless it represents a true destructive/error state.
- Add UI copy to `messages/*.json`; do not hardcode bilingual text inside components.

## Known Future Work

The product is ready for a notification layer, but it is not implemented yet. A low-risk path is:

1. Add a `notifications` table for in-app notification history.
2. Add Web Push subscriptions for user devices.
3. Use Supabase Realtime for visible-page updates such as competition joins/declines.
4. Add transactional email later through a provider such as Resend.

Keep notification fan-out server-side; do not make clients responsible for notifying other users.
