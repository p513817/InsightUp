# Architecture

This document describes the current deployable architecture for InsightUp.

## Runtime Shape

InsightUp currently runs as a single Next.js App Router service deployed to Fly.io.

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

Important product fields:

- `is_included_in_charts`
- `deleted_at`
- `source_type`
- future scan-review columns such as `scan_status` and `requires_review`

## API Surface

Current route handlers:

- `GET /api/me`
- `GET /api/records`
- `POST /api/records`
- `PATCH /api/records/:recordId`
- `DELETE /api/records/:recordId`
- `GET /api/chart-data?view=overall|leftArm|rightArm|trunk|leftLeg|rightLeg`

The `PATCH /api/records/:recordId` route supports both:

- full record updates
- chart inclusion toggles via `{ isIncludedInCharts: boolean }`

## Chart Model

The UI renders one primary chart panel and switches between:

- overall metrics
- per-body-part segmental metrics

Only records with `is_included_in_charts = true` are used when building chart payloads.

## Deployment Notes

- Next.js uses `output: "standalone"`.
- Docker builds the standalone output and serves it with Node 22.
- Fly.io runs a single machine on port 3000.

## Future Extension Path

If the product later requires separate `web` and `api` services, the extraction boundary is already clear:

- `app/api/*` handlers become the initial API surface
- `lib/inbody/*` becomes the shared domain package or API-layer logic
- the client components can keep the same fetch contracts

If photo scan is added, raw uploaded images should not live permanently in the app container. Use a durable store such as Supabase Storage instead of relying on Fly machine filesystem persistence.
