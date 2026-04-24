# Supabase Setup

This directory contains the SQL files for the InsightUp database.

## Files

- `schema.sql`
  Full schema reference file.
- `migrations/20260422_001_init.sql`
  Initial migration for a fresh Supabase project.
- `seed.example.sql`
  Optional example seed data for a real authenticated user.

## Recommended Usage

For a new project:

1. Run `infra/supabase/migrations/20260422_001_init.sql` in the Supabase SQL Editor.
2. Verify that the tables and policies were created.
3. Optionally run `infra/supabase/seed.example.sql` after replacing the placeholder user id.

## Why The Seed Uses A Real User ID

`public.inbody_records.user_id` references `auth.users(id)`.

That means sample records must belong to a real authenticated user already present in Supabase Auth.

If you do not replace the placeholder value in `seed.example.sql`, the script will exit without writing data.

## How To Get A Real User ID

1. Sign in once with your app using Google Login.
2. Open Supabase Dashboard.
3. Go to Authentication > Users.
4. Copy the `id` of the user you want to seed.
5. Replace the placeholder value in `seed.example.sql`.

## Expected Seed Result

The example seed inserts:

- 2 InBody records
- 5 segment rows for each record
- 1 included record
- 1 excluded record

This is enough to test:

- record loading
- chart filtering
- overall metrics
- segmental metrics
- include/exclude behavior
