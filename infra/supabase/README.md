# Supabase Setup

This directory contains the SQL files for the InsightUp database.

## Files

- `schema.sql`
  Full schema reference file.
- `migrations/20260422_001_init.sql`
  Initial migration for a fresh Supabase project.
- `seed.example.sql`
  Optional rich example seed data for a real authenticated user, including
  records, friends, competitions, and goals. The seed is rerunnable and
  restores soft-deleted competition memberships on repeat runs.

## Recommended Usage

For a new project:

1. Run `infra/supabase/migrations/20260422_001_init.sql` in the Supabase SQL Editor.
2. Verify that the tables and policies were created.
3. Optionally run `infra/supabase/seed.example.sql`.

## Why The Seed Uses A Real User ID

`public.inbody_records.user_id` references `auth.users(id)`.

That means sample records must belong to a real authenticated user already present in Supabase Auth.

The checked-in `target_user_id` matches the local demo owner used by the rich demo seeds. For a hosted project, replace it with a real Supabase Auth user id before running the seed.

## How To Get A Real User ID

1. Sign in once with your app using Google Login.
2. Open Supabase Dashboard.
3. Go to Authentication > Users.
4. Copy the `id` of the user you want to seed.
5. Replace `target_user_id` in `seed.example.sql` when you are not using the local demo owner.

## Expected Seed Result

The example seed upserts:

- 6 owner InBody records
- Segment rows for the owner trend records
- 6 demo friend accounts and profiles
- 6 directional friendships for the owner
- 12 friend InBody records
- 4 competitions covering active, completed, and invited states
- Multiple personal and competition-linked goals

This is enough to test:

- record loading
- chart filtering
- overall metrics
- segmental metrics
- include/exclude behavior
- rich friend lists and friend comparison
- multi-competition lists and leaderboards
- multi-goal active and history states
