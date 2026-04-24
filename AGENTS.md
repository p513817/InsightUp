# Agent Guide

## Current Scope

InsightUp is now a single deployable Next.js App Router project at the repository root.

It uses:

- Next.js App Router
- Supabase Auth + database
- Supabase SSR helpers for session propagation
- Route handlers for records and chart data
- Fly.io deployment via Docker

## Product Rules

- A record can exist without being included in chart analysis.
- Exclusion from charts is not deletion.
- Deletion is soft deletion by default (`deleted_at`).
- The primary chart surface must support switching between overall and segmental views.
- Photo scan remains a future input path and should stay review-first.

## Repository Map

- `app/`: Next.js routes, layouts, API routes, and auth callback.
- `components/`: UI primitives and feature components.
- `lib/`: Supabase helpers, record mapping, chart assembly, formatting, and validation.
- `docs/agent/`: English operational docs for future agents.
- `docs/human/`: Chinese user-facing docs for setup, deployment, and usage.
- `archive/legacy-demo/`: Archived static HTML/JS demo kept only for historical reference.
- `infra/supabase/`: SQL schema, migrations, and seed files.

## Commands

- `corepack enable`
- `corepack prepare pnpm@10.6.5 --activate`
- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

Node target: 22 LTS.

## Environment Model

Required env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

OAuth redirect behavior must remain env-driven. Do not hardcode localhost or Fly domains in application code.

## Auth Invariants

- Use path-based routes, never hash-based route state.
- Keep a single browser Supabase client singleton in the client runtime.
- Use SSR helpers and middleware for cookie refresh.
- On auth failure, redirect users back to a visible login surface instead of rendering a blank page.

## Data Notes

Canonical record shape remains aligned with the normalized Supabase schema:

- `inbody_records`
- `inbody_segments`

Segmental fallbacks are still derived from overall metrics when explicit part-level values are absent.

## Implementation Guidance

- Prefer extending the route handlers and shared `lib/inbody/*` helpers before adding feature-specific logic inside page components.
- Keep the current button/card/form visual system consistent with the existing UI primitives in `components/ui/`.
- If the user later requests a split deployment, the current route handlers are the natural extraction point into a separate API service.
- Preserve the English-for-agents / Chinese-for-humans documentation split.
