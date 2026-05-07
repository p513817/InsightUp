# Supabase Schema Notes

This file explains the SQL schema in `infra/supabase/schema.sql`.

## Design Choice

The schema uses the normalized model:

- `public.inbody_records`
- `public.inbody_segments`
- `public.llm_trend_daily_summaries`
- `public.subscription_plans`
- `public.plan_feature_entitlements`
- `public.user_subscriptions`

This is better than keeping all segmental values in one JSON column because:

- chart queries are easier
- updates are cleaner
- future validation is easier
- per-part filtering is simpler

## Core Tables

## `public.inbody_records`

Stores one InBody measurement event for one user.

Important columns:

- `user_id`: owner of the record, linked to `auth.users`
- `recorded_at`: measurement date
- `is_included_in_charts`: controls chart participation
- `source_type`: `manual` or `photo_scan`
- `scan_status`, `scan_confidence`, `requires_review`: support future scan workflows
- `deleted_at`: supports soft deletion

## `public.inbody_segments`

Stores the segmental values attached to a record.

Each record can have at most one row for each body part because of the unique constraint on:

- `(record_id, part_key)`

Supported `part_key` values:

- `leftArm`
- `rightArm`
- `trunk`
- `leftLeg`
- `rightLeg`

## `public.llm_trend_daily_summaries`

Stores the latest AI trend summary for a user, feature, and request date.

Important columns:

- `user_id`: owner of the summary
- `feature_key`: feature namespace, currently `trend_summary`
- `request_date`: the local business date used for daily usage limits
- `summary_text`: latest generated summary body
- `model_name`: Gemini model used for the latest generation
- `usage_count`: same-day regenerate consumption count
- `last_generated_at`: timestamp of the latest successful generation

Current product behavior:

- `GET /api/trend-summary` reads the latest cached summary first
- `POST /api/trend-summary` is the explicit regenerate path
- the uniqueness boundary is `(user_id, feature_key, request_date)`

## `public.subscription_plans`, `public.plan_feature_entitlements`, `public.user_subscriptions`

These tables define plan-driven access to AI and future paid features.

Responsibilities:

- `public.subscription_plans`: plan catalog such as `free` and future paid tiers
- `public.plan_feature_entitlements`: per-plan feature settings like `daily_limit` and `model_pool`
- `public.user_subscriptions`: active or trial plan assignment per user

Recommended access path:

- use `public.resolve_my_feature_entitlement(input_feature)` for app-facing entitlement resolution instead of duplicating plan logic in route handlers

## Product Rules Reflected In Schema

### 1. Record exclusion is not deletion

This is implemented with:

- `is_included_in_charts`
- `deleted_at`

Use cases:

- suspicious measurement but still keep history: set `is_included_in_charts = false`
- user wants to remove from normal views but keep reversible state: set `deleted_at`
- user wants permanent removal: hard delete through API if explicitly allowed

### 2. Photo scan is reviewable input

This is implemented with:

- `source_type`
- `scan_status`
- `scan_confidence`
- `requires_review`
- `raw_extraction_json`
- `source_image_path`

Recommended API behavior:

- uploaded scan first becomes a draft-style record
- user reviews extracted fields
- user confirms before final chart inclusion

### 3. Every record is user-owned

This is enforced by:

- `user_id`
- row level security policies

Users can only access their own records and their own segment rows.

## RLS Behavior

The SQL enables RLS on both core tables.

Policies allow the authenticated user to:

- select their own records
- insert their own records
- update their own records
- delete their own records
- access segment rows only when the parent record belongs to them

## Recommended Query Pattern

For the frontend chart, the backend should usually:

1. load active records with `deleted_at is null`
2. filter by `is_included_in_charts = true`
3. order by `recorded_at`
4. join matching rows from `inbody_segments` when a segment view is requested

## Suggested Next Step

After applying the SQL, the next logical step is:

1. create the API contract for record CRUD
2. decide whether delete means soft delete by default
3. add a seed script or migration for local development
