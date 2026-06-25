# InsightUp

InsightUp is a single Next.js App Router application for tracking InBody records, long-term body composition trends, personal goals, friends, and competitions.

The product rule that matters most: a record can exist in history without being included in chart analysis. Exclusion is not deletion.

## Current Product Surface

- Google sign-in through Supabase Auth.
- InBody record CRUD with soft deletion and chart inclusion toggles.
- Dashboard trend charts for overall and segmental metrics.
- Dashboard preferences for layout, metric order, and trend display.
- AI trend summaries through Gemini, with cached/latest fetch separated from explicit regeneration.
- AI scan draft input for InBody sheets, controlled by daily feature entitlement.
- Personal goals with positive, zero, and negative progress handling.
- Friends by friend code, friend snapshots, and friend history comparison.
- Competitions with invited members, member goals, leaderboard progress, and owner-managed membership.
- Account plan display from Supabase subscription tables.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn-style local UI primitives
- Supabase Auth, Postgres, RLS, and SSR helpers
- Recharts
- React Hook Form + Zod
- Vitest
- Gemini via `@google/genai`
- Vercel production deployment

## Quick Start

1. Install Node 22 LTS.
2. Run `corepack enable`.
3. Run `corepack prepare pnpm@10.6.5 --activate`.
4. Copy `.env.example` to `.env.local`.
5. Fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `GEMINI_API_KEY`
6. Apply Supabase migrations in filename order from `infra/supabase/migrations/`.
7. Run `pnpm install`.
8. Run `pnpm dev`. The local app is served on `http://localhost:5500`.

Do not hardcode localhost or production URLs. OAuth redirect behavior must stay driven by `NEXT_PUBLIC_SITE_URL` and the current request origin.

## Common Commands

- `pnpm dev` (starts Next.js on port `5500`)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

When a user already has a dev server running, do not restart it unless they ask. Use targeted checks such as `pnpm typecheck` or focused Vitest files.

## Documentation Map

Read these first when continuing development:

- Agent quick handoff: `docs/agent/current-state.md`
- Architecture: `docs/agent/architecture.md`
- Developer guide: `docs/agent/developer-guide.md`
- Supabase schema and migration notes: `docs/agent/supabase-schema.md`
- Roadmap: `docs/agent/roadmap.md`

Human-facing docs:

- Local development: `docs/human/local-development.md`
- OAuth environment strategy: `docs/human/oauth-environment-strategy.md`
- Vercel deployment: `docs/human/vercel-deployment.md`
- Product usage guide: `docs/human/usage-guide.md`
- Visual theme: `docs/human/visual-theme.md`
- Landing/product positioning: `docs/human/landing.md`

## Repository Map

- `app/`: App Router pages, route handlers, layouts, and auth callback.
- `components/`: UI primitives and feature components.
- `lib/`: Supabase helpers, InBody domain logic, friends, goals, competitions, i18n, and LLM helpers.
- `messages/`: localized UI strings. Do not hardcode user-facing bilingual copy in components.
- `tests/`: Vitest coverage for domain helpers and feature workflows.
- `infra/supabase/`: schema snapshot, ordered migrations, and seed files.
- `docs/agent/`: English docs optimized for future coding agents.
- `docs/human/`: Traditional Chinese user/deployment docs.
- `archive/legacy-demo/`: historical static demo only.

## Supabase Notes

For rollout, trust ordered migrations in `infra/supabase/migrations/` more than `infra/supabase/schema.sql`. The schema snapshot is useful context, but newer features such as daily feature usage, personal goals, competitions, and competition RPC fixes are migration-driven.

Important RPCs:

- `resolve_my_feature_entitlement`
- `list_friend_latest_records`
- `list_friend_records_history`
- `create_competition_with_members`
- `update_competition_with_members`
- `delete_competition_with_members`
- `list_my_competitions_with_progress`

## Development Invariants

- Keep record exclusion separate from deletion.
- Keep deletion soft by default through `deleted_at`.
- Keep AI usage limits database-driven through entitlement data.
- Keep AI scan review-first; scan output should populate a draft, not silently write final records.
- Keep competition goal target dates locked to the competition target date.
- Keep protected data user-owned through Supabase RLS and server-side session checks.
- Keep UI changes aligned with local primitives, i18n keys, and mobile touch targets.
