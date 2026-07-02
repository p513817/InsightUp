# Developer Guide

This is the English handoff guide for future agents and maintainers working at the repository root.

For the fastest current-state summary, read `docs/agent/current-state.md` first.

## Project Conventions

- UI language is Traditional Chinese.
- Human-facing docs are Traditional Chinese.
- Agent-facing docs are English.
- User-facing copy belongs in `messages/*.json`; do not hardcode bilingual strings inside components.
- Keep reusable UI primitives in `components/ui/` visually consistent.
- Apply the mobile interaction baseline from `AGENTS.md`: 44px minimum touch targets, 8px spacing between adjacent controls, safe-area-aware floating controls.
- Do not reintroduce hardcoded OAuth redirect URLs.
- Keep auth callback `next` targets same-origin path-only; protocol-relative URLs must not be accepted.
- Do not reintroduce hardcoded entitlement bypasses. Feature limits must come from Supabase plan data.

## Working Model

- Protected app pages live under `app/(app)/`.
- Public entry is `app/page.tsx`.
- Auth callback is `app/auth/callback/route.ts`.
- API routes are Next.js route handlers, not a separate server process.
- Supabase SSR helpers are the auth/session boundary for server components and route handlers.
- The browser Supabase client must remain a singleton in the client runtime.

## Preferred Edit Surfaces

- Record CRUD and chart inclusion: `app/api/records/*`, `components/records/*`, `lib/inbody/records.ts`, `lib/inbody/schema.ts`
- Chart payloads and dashboard UI: `app/api/chart-data/route.ts`, `components/charts/*`, `components/workspace/*`
- Dashboard preferences: `app/api/preferences/dashboard/route.ts`, `lib/dashboard-preferences.ts`
- Metric direction and delta tones: `lib/inbody/progress.ts`
- AI trend summary: `app/api/trend-summary/route.ts`, `lib/inbody/trend-summary.ts`, `lib/inbody/trend-summary-service.ts`, `components/charts/trend-summary-fab.tsx`
- AI scan: `app/api/records/scan/route.ts`, `lib/inbody/scan.ts`, `lib/inbody/scan-upload.ts`, `lib/llms/usage.ts`
- Personal goals: `app/api/personal-goals/*`, `components/personal-goals/*`, `lib/personal-goals.ts`
- Shared goal progress UI: `components/ui/goal-progress-bar.tsx`, `components/ui/goal-metric-progress-card.tsx`
- Friends: `app/api/friends/*`, `components/friends/*`, `lib/friends/*`
- Competitions: `app/api/competitions/*`, `components/competitions/*`, `lib/competitions.ts`
- Auth/session: `lib/supabase/*`, `lib/auth/redirects.ts`, `middleware.ts`
- E2E test auth and seed personas: `docs/agent/e2e-test-auth.md`, `app/test-auth/page.tsx`, `components/test-auth/*`, `app/api/test-auth/*`, `lib/test-auth/*`
- Account plan display: `app/(app)/account/page.tsx`
- Database changes: new ordered migration under `infra/supabase/migrations/`

## Toolchain Setup

Install and activate the expected toolchain before running package scripts:

1. Install Node.js 22 LTS.
2. Run `corepack enable`.
3. Run `corepack prepare pnpm@10.6.5 --activate`.
4. Run `pnpm install` from the repository root.

On this Windows workspace, the user may already have a Git Bash session with `load_nvm` and a dev server running on a custom port. Do not restart or rebuild that server unless the user asks. Use checks only.

## Local Validation

Run these from the repository root after meaningful edits:

- `pnpm typecheck`
- focused `pnpm vitest run <test-file>`
- `pnpm lint` for broad changes or before PR/release

Focused tests currently available:

- `tests/inbody-records.test.ts`
- `tests/dashboard-preferences.test.ts`
- `tests/friends.test.ts`
- `tests/llms.test.ts`
- `tests/personal-goals.test.ts`
- `tests/inbody-progress.test.ts`
- `tests/competitions.test.ts`
- `tests/test-auth.test.ts`
- `tests/records-scan-route.test.ts`

## Vercel Smoke Test

After deployment-related, auth, API, or database changes, verify:

- Google sign-in returns to `/dashboard`
- record CRUD works for the authenticated user
- chart inclusion toggles change chart participation without deleting history
- overall and segmental chart views render
- dashboard preferences persist after refresh
- AI scan entitlement state loads and scan output appears as a draft
- `GET /api/trend-summary` returns latest summary state without forcing regeneration
- `POST /api/trend-summary` regenerates only when entitlement usage is available
- personal goals show correct positive/negative progress
- friend code add/remove and friend history work
- competition create/edit/detail/membership/goal flows work
- account page shows the current plan level

## Database Change Rules

- Prefer additive migrations.
- Keep migrations ordered by date and sequence.
- Do not edit already-applied migrations unless the user explicitly requests a local-only rewrite.
- If app behavior depends on entitlement limits, add or update plan entitlement data in SQL first.
- Keep RLS in mind for every user-owned table.
- Prefer RPCs for multi-table writes that must be authorization-safe and atomic.

## Known Constraints

- `infra/supabase/schema.sql` is not always a full latest dump. For rollout truth, inspect ordered migrations.
- Chart exclusion is a first-class product rule and must stay independent from deletion.
- AI usage rules must stay database-driven.
- AI scan should not directly save records without user review.
- Generic personal goal creation must strip competition-owned fields; competition-linked goals should be created through competition goal flows.
- Competition goal target dates are locked by database triggers and should also be blocked in the frontend.
- Competition members with no goals or declined/removed status should sort below active members with goals.
- Windows PowerShell may fail to execute `rg.exe` in this environment; use PowerShell `Get-ChildItem` and `Select-String` as fallback.
