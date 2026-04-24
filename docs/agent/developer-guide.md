# Developer Guide

## Goal

This document is the English handoff guide for future agents and maintainers working at the repository root.

## Project Conventions

- UI language is zh-TW.
- Human-facing docs are written in Chinese.
- Agent-facing docs are written in English.
- Keep the reusable UI primitives in `components/ui/` visually consistent.
- Do not reintroduce hardcoded OAuth redirect URLs.

## Working Model

- The protected app lives under `app/(app)/`.
- Public entry is `app/page.tsx`.
- Auth callback is `app/auth/callback/route.ts`.
- API routes are route handlers, not a separate server process.

## Preferred Edit Surfaces

- Domain changes: `lib/inbody/*`
- Auth/session changes: `lib/supabase/*` and `middleware.ts`
- New UI building blocks: `components/ui/*`
- Dashboard/profile behavior: `components/workspace/records-workspace.tsx`

## Toolchain Setup

Install and activate the expected toolchain before running package scripts:

1. Install Node.js 22 LTS.
2. Run `corepack enable`.
3. Run `corepack prepare pnpm@10.6.5 --activate`.
4. Run `pnpm install` from the repository root.

If Corepack is unavailable, install pnpm manually and keep the package manager version aligned with `package.json`.

## Local Validation

Run these from the repository root after meaningful edits:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Known Constraints

- The local environment in this workspace may not have Node installed yet. If runtime validation is unavailable, keep static changes narrow and document the missing prerequisite in your final note.
- The Supabase schema is already normalized. Do not collapse segmental data back into a single JSON blob.
- Chart exclusion is a first-class product rule and must stay independent from deletion.
