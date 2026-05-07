# Architecture

This document describes the current deployable architecture for InsightUp.

## Runtime Shape

InsightUp currently runs as a single Next.js App Router service deployed to Vercel.

The project intentionally keeps one deployable unit for now because it reduces operational overhead while preserving a clean extraction path for a future dedicated API service.

## Layers

### App Router

`app/` contains:

- public landing page
- protected dashboard and profile routes
- route handlers under `app/api/*`
- OAuth callback under `app/auth/callback`

### Feature Components

`components/` contains:

- shared UI primitives in `components/ui/`
- auth buttons and navigation
- chart rendering
- record form dialog
- record manager and page workspace containers

### Domain Logic

`lib/inbody/` contains the product logic that should stay framework-light:

- record typing
- zod validation
- row-to-domain mapping
- segmental fallback derivation
- chart payload assembly
- Supabase CRUD helpers

### Supabase SSR Integration

`lib/supabase/` contains:

- browser client singleton
- server-side client factory
- middleware session refresh helper

The app uses the public Supabase URL and anon key only. No service-role key is required for the current architecture because row-level security is enforced in Supabase.

## Auth Flow

1. The landing page triggers Google sign-in with Supabase OAuth.
2. Redirects always target `/auth/callback`, constructed from `NEXT_PUBLIC_SITE_URL` or the current origin.
3. The callback route exchanges the code for a session.
4. Middleware keeps session cookies fresh.
5. Protected routes redirect unauthenticated users back to `/`.

## Data Model

The application uses the normalized schema already defined in `infra/supabase/schema.sql`:

- `public.inbody_records`
- `public.inbody_segments`
- `public.llm_trend_daily_summaries`
- `public.subscription_plans`
- `public.plan_feature_entitlements`
- `public.user_subscriptions`

Important product fields:

- `is_included_in_charts`
- `deleted_at`
- `source_type`
- future scan-review columns such as `scan_status` and `requires_review`
- `feature_key`, `usage_count`, and `last_generated_at` on `public.llm_trend_daily_summaries`

## API Surface

Current route handlers:

- `GET /api/me`
- `GET /api/records`
- `POST /api/records`
- `PATCH /api/records/:recordId`
- `DELETE /api/records/:recordId`
- `GET /api/chart-data?view=overall|leftArm|rightArm|trunk|leftLeg|rightLeg`
- `GET /api/trend-summary`
- `POST /api/trend-summary`

The trend summary flow is intentionally split:

- `GET /api/trend-summary` fetches the latest available summary and current same-day usage state
- `POST /api/trend-summary` explicitly regenerates a summary if entitlement limits allow it

Gemini prompt assembly stays in `lib/inbody/trend-summary.ts` and includes both overall metrics and segment/body-part data in a compact payload.

The `PATCH /api/records/:recordId` route supports both:

- full record updates
- chart inclusion toggles via `{ isIncludedInCharts: boolean }`

## Chart Model

The UI renders one primary chart panel and switches between:

- overall metrics
- per-body-part segmental metrics

Only records with `is_included_in_charts = true` are used when building chart payloads.

## Deployment Notes

- Production deployment target is Vercel.
- Required production env vars currently include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and `GEMINI_API_KEY`.
- Keep deployment assumptions aligned with Vercel defaults unless the user explicitly requests another hosting target.

## Future Extension Path

If the product later requires separate `web` and `api` services, the extraction boundary is already clear:

- `app/api/*` handlers become the initial API surface
- `lib/inbody/*` becomes the shared domain package or API-layer logic
- the client components can keep the same fetch contracts

If photo scan is added, raw uploaded images should not live permanently in the app runtime. Use a durable store such as Supabase Storage instead of relying on ephemeral deployment filesystem behavior.
