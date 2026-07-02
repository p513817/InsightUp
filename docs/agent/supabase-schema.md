# Supabase Schema Notes

This file explains the current Supabase data model and rollout expectations.

## Source Of Truth

For a new or production database, apply SQL files in filename order from:

`infra/supabase/migrations/`

`infra/supabase/schema.sql` is useful context, but it may lag newer migrations. Do not assume it contains the full latest schema.

## Migration Groups

- `20260422_001_init.sql`: InBody records, segments, helper trigger, base RLS
- `20260424_001_dashboard_preferences.sql`: dashboard preferences
- `20260424_002_friends.sql`: profiles, friend codes, directed friendships, friend snapshot RPC
- `20260424_003_friend_snapshot_deltas.sql`: friend snapshot deltas
- `20260428_001_active_records_security_invoker.sql`: active records security invoker adjustment
- `20260506_001_llm_trend_daily_summaries.sql`: trend summary storage
- `20260506_002_add_model_name_to_llm_trend_daily_summaries.sql`: summary model metadata
- `20260506_003_llm_feature_entitlements.sql`: subscription plans, feature entitlements, entitlement RPC
- `20260520_001_llm_daily_feature_usage.sql`: daily usage accounting for feature-specific LLM calls
- `20260605_001_friend_record_history.sql`: friend record history RPC
- `20260605_002_friend_record_history_limited.sql`: limited friend history RPC
- `20260608_001_user_personal_goals.sql`: personal goals
- `20260608_002_add_target_date_to_user_personal_goals.sql`: goal target date
- `20260608_003_add_title_to_user_personal_goals.sql`: goal title
- `20260608_004_add_start_record_to_user_personal_goals.sql`: goal start record
- `20260609_001_competitions.sql`: competitions, competition members, competition-linked goals, progress RPC
- `20260610_001_update_competitions_with_members.sql`: competition update RPC
- `20260610_002_fix_update_competition_with_members_ambiguity.sql`: update RPC ambiguity fix
- `20260610_003_fix_competition_members_rls_recursion.sql`: competition member RLS recursion fix
- `20260610_004_delete_competition_with_members.sql`: competition delete RPC
- `20260701_001_harden_competition_membership_oracle.sql`: competition membership oracle requires the signed-in user to match `input_user_id` and defaults to invited/accepted statuses

## Core Tables

### `public.inbody_records`

Stores one InBody measurement event for one user.

Important columns:

- `user_id`: owner, linked to `auth.users`
- `recorded_at`: measurement date
- `is_included_in_charts`: controls chart participation
- `source_type`: `manual` or `photo_scan`
- `scan_status`, `scan_confidence`, `requires_review`: future/review-first scan metadata
- `raw_extraction_json`, `source_image_path`: scan provenance
- `deleted_at`: soft deletion

Product rule:

- exclude from chart by setting `is_included_in_charts = false`
- hide/remove from normal views by setting `deleted_at`
- do not confuse those two states

### `public.inbody_segments`

Stores segmental values attached to a record.

Each record can have at most one row for each `part_key`:

- `leftArm`
- `rightArm`
- `trunk`
- `leftLeg`
- `rightLeg`

### `public.user_dashboard_preferences`

Stores per-user dashboard display preferences such as layout, metric order, and visible metrics.

App entry points:

- `lib/dashboard-preferences.ts`
- `app/api/preferences/dashboard/route.ts`

### `public.user_profiles`

Stores the user-facing profile used by friends and competitions:

- `user_id`
- `friend_code`
- `display_name`
- `avatar_url`

Profiles are upserted from the authenticated Supabase user summary.

### `public.user_friendships`

Stores directed friend links from `user_id` to `friend_user_id`.

Friend comparisons use RPCs rather than broad table reads so RLS stays narrow.

### `public.llm_trend_daily_summaries`

Stores the latest AI trend summary for a user, feature, and request date.

Important columns:

- `user_id`
- `feature_key`, currently `trend_summary`
- `request_date`, based on the Taipei business date helper
- `summary_text`
- `model_name`
- `usage_count`
- `last_generated_at`

Current product behavior:

- `GET /api/trend-summary` reads latest cached state
- `POST /api/trend-summary` explicitly regenerates
- uniqueness boundary is `(user_id, feature_key, request_date)`

### `public.llm_daily_feature_usage`

Stores daily feature usage counts for non-summary LLM features, currently used by AI scan.

Important columns:

- `user_id`
- `feature_key`, for example `inbody_scan`
- `request_date`
- `usage_count`

Use helpers in `lib/llms/usage.ts`.

### `public.subscription_plans`, `public.plan_feature_entitlements`, `public.user_subscriptions`

These tables define plan-driven feature limits and config.

Recommended access path:

- `public.resolve_my_feature_entitlement(input_feature)`

Do not duplicate plan fallback logic in route handlers unless there is a clear reason.

### `public.user_personal_goals`

Stores standalone and competition-linked goals.

Important columns:

- `user_id`
- `title`
- `start_record_id`
- `metric_key`
- `start_value`
- `target_value`
- `unit`
- `target_date`
- `competition_id`
- `competition_member_id`
- `target_date_locked`
- `deleted_at`

Goal progress is calculated in application code with the latest eligible InBody record. If `target_date` exists, progress uses the latest record on or before that date.

Zero-change targets are valid. If start and target are equal, exact equality means complete; any deviation is negative progress.

### `public.competitions`

Stores the competition container:

- `owner_id`
- `name`
- `target_date`
- `status`
- timestamps

Competition target date drives linked goal target dates. Backend triggers prevent changing locked competition goal target dates.

### `public.competition_members`

Stores participant state:

- `competition_id`
- `user_id`
- `role`: `owner` or `participant`
- `status`: `invited`, `accepted`, `declined`, or `removed`
- `invited_by_user_id`
- `joined_at`

Competition UI sorts declined/removed members and members without goals below active members with goals.

## Important RPCs

### Friends

- `find_user_profile_by_friend_code(input_code text)`
- `list_friend_latest_records()`
- `list_friend_records_history(input_friend_user_id uuid, input_limit integer default null)`

### Entitlements

- `resolve_my_feature_entitlement(input_feature text)`

### Competitions

- `create_competition_with_members(input_name text, input_target_date date, input_invitee_user_ids uuid[])`
- `update_competition_with_members(input_competition_id uuid, input_name text, input_target_date date, input_invitee_user_ids uuid[])`
- `delete_competition_with_members(input_competition_id uuid)`
- `list_my_competitions_with_progress()`
- `can_access_competition_membership(input_competition_id uuid, input_user_id uuid, allowed_statuses text[] default array['invited', 'accepted'])`

Use these RPCs instead of manually coordinating multi-table competition writes in route handlers.

## RLS Behavior

Core rule: users can access their own data and data explicitly shared through friendship or competition membership.

RLS is enabled on user-owned tables. Policies allow authenticated users to:

- select/insert/update/delete their own records and segments
- manage their own dashboard preferences
- view and update their own profile
- manage their directed friendships
- read their own LLM summaries and daily usage
- read active plan catalog/entitlements
- read their own subscriptions
- read competitions they belong to
- owners can update competitions and insert/manage members through RPCs
- members can update their own membership status

## Recommended Query Patterns

For chart data:

1. load records where `deleted_at is null`
2. filter to `is_included_in_charts = true`
3. order by `recorded_at`
4. join segments only when needed for the selected chart view

For goal progress:

1. load goals where `deleted_at is null`
2. choose latest eligible record, respecting `target_date`
3. calculate progress in `lib/personal-goals.ts`
4. render with shared goal progress UI

For competitions:

1. read via `list_my_competitions_with_progress()`
2. group rows with `groupCompetitionProgressRows`
3. attach current user member in page/server code
4. sort leaderboard with `getCompetitionLeaderBoard`

## Future Notification Schema Direction

Not implemented yet, but likely additions:

- `notifications`: durable in-app notification history
- `push_subscriptions`: Web Push endpoint and key storage per user/device
- optional `notification_deliveries`: delivery attempts for push/email

Keep notification writes server-side and RLS-limited. Clients should subscribe/read; they should not be trusted to notify other users.
