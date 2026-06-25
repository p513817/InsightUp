# Agent Guide

## Current Scope

InsightUp is now a single deployable Next.js App Router project at the repository root.

It uses:

- Next.js App Router
- Supabase Auth + database
- Supabase SSR helpers for session propagation
- Route handlers for records and chart data
- Route handlers for LLM trend summaries with Gemini integration
- Vercel for production deployment

## Product Rules

- A record can exist without being included in chart analysis.
- Exclusion from charts is not deletion.
- Deletion is soft deletion by default (`deleted_at`).
- The primary chart surface must support switching between overall and segmental views.
- AI trend summary should read the latest recent records, prefer compressed payloads, and treat cached/latest summary retrieval separately from explicit regeneration.
- Daily AI usage limits must be plan-driven from the database, not hardcoded in application code.
- Photo scan remains a future input path and should stay review-first.

## Repository Map

- `app/`: Next.js routes, layouts, API routes, and auth callback.
- `components/`: UI primitives and feature components.
- `lib/`: Supabase helpers, record mapping, chart assembly, formatting, and validation.
- `app/api/trend-summary/route.ts`: AI trend summary endpoint with `GET` for latest summary fetch and `POST` for regeneration.
- `lib/inbody/trend-summary.ts`: Prompt compaction and recent-record assembly for Gemini, including segmental/body-part metrics.
- `docs/agent/`: English operational docs for future agents.
- `docs/human/`: Chinese user-facing docs for setup, deployment, and usage.
- `archive/legacy-demo/`: Archived static HTML/JS demo kept only for historical reference.
- `infra/supabase/`: SQL schema, migrations, and seed files.

## Commands

- `corepack enable`
- `corepack prepare pnpm@10.6.5 --activate`
- `pnpm install`
- `pnpm dev` (always starts local development on port `5500`)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

Node target: 22 LTS.

## Environment Model

Required env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `GEMINI_API_KEY`

OAuth redirect behavior must remain env-driven. Do not hardcode localhost or production domains in application code.
Local development must use `http://localhost:5500` for `NEXT_PUBLIC_SITE_URL` and the dev server port because Google OAuth redirect URLs are configured for that origin. Do not start this project on port `3000` for normal local auth testing.

## Auth Invariants

- Use path-based routes, never hash-based route state.
- Keep a single browser Supabase client singleton in the client runtime.
- Use SSR helpers and middleware for cookie refresh.
- On auth failure, redirect users back to a visible login surface instead of rendering a blank page.

## Data Notes

Canonical record shape remains aligned with the normalized Supabase schema:

- `inbody_records`
- `inbody_segments`
- `llm_trend_daily_summaries`
- `subscription_plans`
- `plan_feature_entitlements`
- `user_subscriptions`

Segmental fallbacks are still derived from overall metrics when explicit part-level values are absent.

Current AI summary storage/entitlement model:

- `llm_trend_daily_summaries` stores the latest generated summary per `user_id + feature_key + request_date`.
- `usage_count` tracks same-day regenerate consumption.
- `last_generated_at` is the preferred display timestamp for the latest generated result.
- `resolve_my_feature_entitlement(input_feature)` is the canonical DB entry point for feature limits and config.
- Default free entitlement currently grants `trend_summary` once per day.

Migration order currently matters for production rollout:

- `20260506_001_llm_trend_daily_summaries.sql`
- `20260506_002_add_model_name_to_llm_trend_daily_summaries.sql`
- `20260506_003_llm_feature_entitlements.sql`

These migrations assume `public.set_updated_at()` and `gen_random_uuid()` are already available in the Supabase project.

## AI Trend Summary Notes

- The floating action entry lives in `components/charts/trend-summary-fab.tsx` and is mounted from the dashboard/records workspace.
- Modal open should fetch the latest summary first via `GET /api/trend-summary`.
- Regeneration should happen only from the explicit action button via `POST /api/trend-summary`.
- Built-in rule-based fallback summaries were intentionally removed; provider failures should surface as real errors.
- Gemini calls use the official `@google/genai` SDK.
- Model selection is driven by entitlement config `model_pool`; rotation can be disabled with `allow_rotation: false`.
- Current default rotation pool is:
  - `gemini-2.5-flash-lite`
  - `gemini-2.5-flash`
  - `gemini-2.5-pro`
  - `gemini-3.1-flash-lite-preview`
  - `gemini-3-flash-preview`
- Prompt inputs are compacted before sending and include both overall metrics and segment/body-part metrics.
- Keep provider/model metadata available in the response so UI can show cache/provider/model state.

## Account Surface Notes

- Account page now shows the current user plan/level.
- Plan display currently resolves from active `user_subscriptions`, then falls back to the default plan in `subscription_plans`.
- If plan logic grows, prefer moving the account-plan resolution into a shared helper or RPC rather than duplicating page-level queries.

## Implementation Guidance

- Prefer extending the route handlers and shared `lib/inbody/*` helpers before adding feature-specific logic inside page components.
- Keep the current button/card/form visual system consistent with the existing UI primitives in `components/ui/`.
- For user-facing UI copy, do not hardcode bilingual strings directly inside components. Add or update localized keys in `messages/*.json` and resolve them through the existing i18n helpers/hooks so both language modes stay consistent.
- For AI summary changes, update DB entitlements/migrations first when behavior depends on plan limits or model configuration.
- Do not reintroduce hardcoded developer bypass rules; use subscription or entitlement data instead.
- Production deploy target is now Vercel; do not assume Fly-specific config still exists in the repository.
- If the user later requests a split deployment, the current route handlers are the natural extraction point into a separate API service.
- Preserve the English-for-agents / Chinese-for-humans documentation split.

## UI/UX Execution Baseline (Mandatory)

For every future UI change in this project, agents must apply the Apple HIG mobile interaction baseline and the `ui-ux-pro-max` ergonomic touch rules by default.

- Minimum tappable area: `44x44pt` (Apple baseline).
- Floating corner primary action size: `56px`; secondary corner action size: `48px`.
- Edge spacing for corner floating controls: prefer `20px` (minimum `16px`).
- Bottom offset for floating controls must include safe area using `env(safe-area-inset-bottom)`.
- Spacing between adjacent tappable controls: minimum `8px`.
- Keep one primary floating action per screen; secondary floating actions should be visually demoted by size/contrast.
- Do not upscale every floating action blindly; preserve visual hierarchy and content-first layout.

When user feedback conflicts with these defaults, user feedback wins, but changes should still remain within accessibility-safe bounds.
