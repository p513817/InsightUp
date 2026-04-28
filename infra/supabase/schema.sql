-- InsightUp / Supabase schema
-- Apply this file in the Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'gender_type') then
    create type public.gender_type as enum ('male', 'female', 'other', 'unknown');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'record_source_type') then
    create type public.record_source_type as enum ('manual', 'photo_scan');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'scan_status_type') then
    create type public.scan_status_type as enum ('not_applicable', 'pending', 'processed', 'reviewed', 'failed');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'segment_part_key') then
    create type public.segment_part_key as enum ('leftArm', 'rightArm', 'trunk', 'leftLeg', 'rightLeg');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.generate_friend_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(encode(gen_random_bytes(5), 'hex'));
    exit when not exists (
      select 1
      from public.user_profiles
      where friend_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create table if not exists public.inbody_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at date not null,
  height numeric(5,2),
  age integer,
  gender public.gender_type not null default 'unknown',
  score integer,
  weight numeric(6,2),
  muscle numeric(6,2),
  fat numeric(6,2),
  fat_percent numeric(5,2),
  visceral_fat_level integer,
  bmr integer,
  recommended_calories integer,
  is_included_in_charts boolean not null default true,
  source_type public.record_source_type not null default 'manual',
  source_image_path text,
  scan_status public.scan_status_type not null default 'not_applicable',
  scan_confidence numeric(5,2),
  requires_review boolean not null default false,
  raw_extraction_json jsonb,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inbody_records_age_check check (age is null or age >= 0),
  constraint inbody_records_height_check check (height is null or height > 0),
  constraint inbody_records_score_check check (score is null or score between 0 and 100),
  constraint inbody_records_weight_check check (weight is null or weight >= 0),
  constraint inbody_records_muscle_check check (muscle is null or muscle >= 0),
  constraint inbody_records_fat_check check (fat is null or fat >= 0),
  constraint inbody_records_fat_percent_check check (fat_percent is null or fat_percent >= 0),
  constraint inbody_records_visceral_fat_level_check check (visceral_fat_level is null or visceral_fat_level >= 0),
  constraint inbody_records_bmr_check check (bmr is null or bmr >= 0),
  constraint inbody_records_recommended_calories_check check (recommended_calories is null or recommended_calories >= 0),
  constraint inbody_records_scan_confidence_check check (
    scan_confidence is null or (scan_confidence >= 0 and scan_confidence <= 100)
  ),
  constraint inbody_records_source_scan_check check (
    (source_type = 'manual' and scan_status = 'not_applicable')
    or source_type = 'photo_scan'
  )
);

create table if not exists public.inbody_segments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.inbody_records(id) on delete cascade,
  part_key public.segment_part_key not null,
  part_name text not null,
  muscle numeric(6,2),
  fat numeric(6,2),
  muscle_ratio numeric(6,2),
  fat_ratio numeric(6,2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inbody_segments_unique_part unique (record_id, part_key),
  constraint inbody_segments_muscle_check check (muscle is null or muscle >= 0),
  constraint inbody_segments_fat_check check (fat is null or fat >= 0),
  constraint inbody_segments_muscle_ratio_check check (muscle_ratio is null or muscle_ratio >= 0),
  constraint inbody_segments_fat_ratio_check check (fat_ratio is null or fat_ratio >= 0)
);

create table if not exists public.user_dashboard_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  metric_order text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_dashboard_preferences_metric_order_limit check (
    coalesce(array_length(metric_order, 1), 0) <= 24
  )
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  friend_code text not null unique default public.generate_friend_code(),
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_profiles_friend_code_format check (friend_code ~ '^[A-Z0-9]{10}$')
);

create table if not exists public.user_friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, friend_user_id),
  constraint user_friendships_no_self_reference check (user_id <> friend_user_id)
);

create index if not exists inbody_records_user_recorded_at_idx
  on public.inbody_records (user_id, recorded_at desc)
  where deleted_at is null;

create index if not exists inbody_records_user_chart_idx
  on public.inbody_records (user_id, is_included_in_charts, recorded_at desc)
  where deleted_at is null;

create index if not exists inbody_records_source_type_idx
  on public.inbody_records (source_type, scan_status);

create index if not exists inbody_segments_record_id_idx
  on public.inbody_segments (record_id);

create index if not exists user_friendships_friend_user_id_idx
  on public.user_friendships (friend_user_id);

drop trigger if exists set_inbody_records_updated_at on public.inbody_records;
create trigger set_inbody_records_updated_at
before update on public.inbody_records
for each row
execute function public.set_updated_at();

drop trigger if exists set_inbody_segments_updated_at on public.inbody_segments;
create trigger set_inbody_segments_updated_at
before update on public.inbody_segments
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_dashboard_preferences_updated_at on public.user_dashboard_preferences;
create trigger set_user_dashboard_preferences_updated_at
before update on public.user_dashboard_preferences
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

create or replace function public.find_user_profile_by_friend_code(input_code text)
returns table (
  user_id uuid,
  friend_code text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.friend_code, p.display_name, p.avatar_url
  from public.user_profiles p
  where auth.uid() is not null
    and p.friend_code = upper(regexp_replace(trim(coalesce(input_code, '')), '\s+', '', 'g'))
  limit 1;
$$;

drop function if exists public.list_friend_latest_records();
create or replace function public.list_friend_latest_records()
returns table (
  friend_user_id uuid,
  friend_code text,
  display_name text,
  avatar_url text,
  linked_at timestamptz,
  latest_recorded_at date,
  latest_weight numeric,
  latest_weight_delta numeric,
  latest_muscle numeric,
  latest_muscle_delta numeric,
  latest_fat numeric,
  latest_fat_delta numeric,
  latest_fat_percent numeric,
  latest_fat_percent_delta numeric,
  latest_score integer,
  latest_score_delta integer,
  latest_source_type public.record_source_type
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.friend_user_id,
    p.friend_code,
    p.display_name,
    p.avatar_url,
    f.created_at as linked_at,
    latest.recorded_at as latest_recorded_at,
    latest.weight as latest_weight,
    case when previous.weight is null or latest.weight is null then null else latest.weight - previous.weight end as latest_weight_delta,
    latest.muscle as latest_muscle,
    case when previous.muscle is null or latest.muscle is null then null else latest.muscle - previous.muscle end as latest_muscle_delta,
    latest.fat as latest_fat,
    case when previous.fat is null or latest.fat is null then null else latest.fat - previous.fat end as latest_fat_delta,
    latest.fat_percent as latest_fat_percent,
    case when previous.fat_percent is null or latest.fat_percent is null then null else latest.fat_percent - previous.fat_percent end as latest_fat_percent_delta,
    latest.score as latest_score,
    case when previous.score is null or latest.score is null then null else latest.score - previous.score end as latest_score_delta,
    latest.source_type as latest_source_type
  from public.user_friendships f
  join public.user_profiles p on p.user_id = f.friend_user_id
  left join lateral (
    select r.recorded_at, r.weight, r.muscle, r.fat, r.fat_percent, r.score, r.source_type
    from public.inbody_records r
    where r.user_id = f.friend_user_id
      and r.deleted_at is null
    order by r.recorded_at desc, r.created_at desc
    limit 1
  ) latest on true
  left join lateral (
    select r.weight, r.muscle, r.fat, r.fat_percent, r.score
    from public.inbody_records r
    where r.user_id = f.friend_user_id
      and r.deleted_at is null
    order by r.recorded_at desc, r.created_at desc
    offset 1
    limit 1
  ) previous on true
  where auth.uid() is not null
    and f.user_id = auth.uid()
  order by coalesce(latest.recorded_at::timestamptz, f.created_at) desc, p.display_name asc;
$$;

create or replace view public.active_inbody_records as
select *
from public.inbody_records
where deleted_at is null;

alter table public.inbody_records enable row level security;
alter table public.inbody_segments enable row level security;
alter table public.user_dashboard_preferences enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_friendships enable row level security;

drop policy if exists "Users can view their own records" on public.inbody_records;
create policy "Users can view their own records"
on public.inbody_records
for select
using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "Users can insert their own records" on public.inbody_records;
create policy "Users can insert their own records"
on public.inbody_records
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own records" on public.inbody_records;
create policy "Users can update their own records"
on public.inbody_records
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own records" on public.inbody_records;
create policy "Users can delete their own records"
on public.inbody_records
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view segments of their own records" on public.inbody_segments;
create policy "Users can view segments of their own records"
on public.inbody_segments
for select
using (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
      and r.deleted_at is null
  )
);

drop policy if exists "Users can insert segments of their own records" on public.inbody_segments;
create policy "Users can insert segments of their own records"
on public.inbody_segments
for insert
with check (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "Users can update segments of their own records" on public.inbody_segments;
create policy "Users can update segments of their own records"
on public.inbody_segments
for update
using (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete segments of their own records" on public.inbody_segments;
create policy "Users can delete segments of their own records"
on public.inbody_segments
for delete
using (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "Users can view their own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can view their own dashboard preferences"
on public.user_dashboard_preferences
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can insert their own dashboard preferences"
on public.user_dashboard_preferences
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can update their own dashboard preferences"
on public.user_dashboard_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view their own profile" on public.user_profiles;
create policy "Users can view their own profile"
on public.user_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
on public.user_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
on public.user_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view their own friendships" on public.user_friendships;
create policy "Users can view their own friendships"
on public.user_friendships
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own friendships" on public.user_friendships;
create policy "Users can insert their own friendships"
on public.user_friendships
for insert
with check (auth.uid() = user_id and auth.uid() <> friend_user_id);

drop policy if exists "Users can delete their own friendships" on public.user_friendships;
create policy "Users can delete their own friendships"
on public.user_friendships
for delete
using (auth.uid() = user_id);

comment on table public.inbody_records is
'User-owned InBody records. Supports manual entry, photo scan, chart inclusion, and soft deletion.';

comment on column public.inbody_records.is_included_in_charts is
'When false, the record stays stored but should be excluded from chart analysis.';

comment on column public.inbody_records.deleted_at is
'Soft delete marker. Prefer this over hard delete when the product wants reversible removal.';

comment on table public.inbody_segments is
'Per-body-part composition values attached to an InBody record.';

comment on table public.user_dashboard_preferences is
'User-owned dashboard UI preferences such as metric card order.';

comment on table public.user_profiles is
'Per-user sharing profile used for friend lookup and safe display metadata.';

comment on column public.user_profiles.friend_code is
'Stable 10-character code that a user can share so others can add them as a friend.';

comment on table public.user_friendships is
'Directional friend list. A row means the owner chose to follow the target friend.';

commit;
