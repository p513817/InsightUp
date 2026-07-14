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

create or replace function public.list_friend_records(input_friend_user_id uuid, input_limit integer default null)
returns table (
  id uuid,
  user_id uuid,
  recorded_at date,
  height numeric,
  age integer,
  gender public.gender_type,
  score integer,
  weight numeric,
  muscle numeric,
  fat numeric,
  fat_percent numeric,
  visceral_fat_level integer,
  bmr integer,
  recommended_calories integer,
  is_included_in_charts boolean,
  source_type public.record_source_type,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ordered_records as (
    select
      r.id,
      r.user_id,
      r.recorded_at,
      r.height,
      r.age,
      r.gender,
      r.score,
      r.weight,
      r.muscle,
      r.fat,
      r.fat_percent,
      r.visceral_fat_level,
      r.bmr,
      r.recommended_calories,
      r.is_included_in_charts,
      r.source_type,
      r.created_at,
      r.updated_at
    from public.user_friendships f
    join public.inbody_records r on r.user_id = f.friend_user_id
    where auth.uid() is not null
      and f.user_id = auth.uid()
      and f.friend_user_id = input_friend_user_id
      and r.deleted_at is null
    order by r.recorded_at desc, r.created_at desc
  ),
  limited_records as (
    select *
    from ordered_records
    limit coalesce(input_limit, 2147483647)
  )
  select *
  from limited_records
  order by recorded_at asc, created_at asc;
$$;

create or replace function public.list_friend_records_history(input_friend_user_id uuid, input_limit integer default null)
returns table (
  id uuid,
  user_id uuid,
  recorded_at date,
  height numeric,
  age integer,
  gender public.gender_type,
  score integer,
  weight numeric,
  muscle numeric,
  fat numeric,
  fat_percent numeric,
  visceral_fat_level integer,
  bmr integer,
  recommended_calories integer,
  is_included_in_charts boolean,
  source_type public.record_source_type,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ordered_records as (
    select
      r.id,
      r.user_id,
      r.recorded_at,
      r.height,
      r.age,
      r.gender,
      r.score,
      r.weight,
      r.muscle,
      r.fat,
      r.fat_percent,
      r.visceral_fat_level,
      r.bmr,
      r.recommended_calories,
      r.is_included_in_charts,
      r.source_type,
      r.created_at,
      r.updated_at
    from public.user_friendships f
    join public.inbody_records r on r.user_id = f.friend_user_id
    where auth.uid() is not null
      and f.user_id = auth.uid()
      and f.friend_user_id = input_friend_user_id
      and r.deleted_at is null
    order by r.recorded_at desc, r.created_at desc
  ),
  limited_records as (
    select *
    from ordered_records
    limit coalesce(input_limit, 2147483647)
  )
  select *
  from limited_records
  order by recorded_at asc, created_at asc;
$$;

comment on function public.list_friend_records_history(uuid, integer) is
'Returns non-deleted InBody records for a friend only when the signed-in user has that friend in user_friendships. The optional limit returns the latest N records.';

create or replace view public.active_inbody_records
with (security_invoker = on) as
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
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own records" on public.inbody_records;
create policy "Users can insert their own records"
on public.inbody_records
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own records" on public.inbody_records;
create policy "Users can update their own records"
on public.inbody_records
for update
using (
  auth.uid() = user_id
  and deleted_at is null
)
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

create table if not exists public.llm_daily_feature_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  request_date date not null,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint llm_daily_feature_usage_feature_key_check check (char_length(trim(feature_key)) > 0),
  constraint llm_daily_feature_usage_usage_count_check check (usage_count >= 0)
);

create unique index if not exists llm_daily_feature_usage_user_feature_date_idx_unique
  on public.llm_daily_feature_usage (user_id, feature_key, request_date);

create index if not exists llm_daily_feature_usage_user_feature_date_idx
  on public.llm_daily_feature_usage (user_id, feature_key, request_date desc, updated_at desc);

drop trigger if exists set_llm_daily_feature_usage_updated_at on public.llm_daily_feature_usage;
create trigger set_llm_daily_feature_usage_updated_at
before update on public.llm_daily_feature_usage
for each row
execute function public.set_updated_at();

alter table public.llm_daily_feature_usage enable row level security;

drop policy if exists "Users can view their own llm daily feature usage" on public.llm_daily_feature_usage;
create policy "Users can view their own llm daily feature usage"
on public.llm_daily_feature_usage
for select
using (auth.uid() = user_id);

create or replace function public.reserve_my_daily_feature_usage(
  input_feature text,
  input_request_date date,
  input_daily_limit integer default null
)
returns table (
  allowed boolean,
  usage_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_feature text := trim(coalesce(input_feature, ''));
  v_usage_count integer;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if char_length(v_feature) = 0 then
    raise exception 'feature key is required';
  end if;

  if input_request_date is null then
    raise exception 'request date is required';
  end if;

  if input_daily_limit = 0 then
    select coalesce(u.usage_count, 0)
    into v_usage_count
    from public.llm_daily_feature_usage u
    where u.user_id = v_user_id
      and u.feature_key = v_feature
      and u.request_date = input_request_date;

    return query select false, coalesce(v_usage_count, 0);
    return;
  end if;

  loop
    insert into public.llm_daily_feature_usage (
      user_id,
      feature_key,
      request_date,
      usage_count,
      last_used_at
    )
    values (
      v_user_id,
      v_feature,
      input_request_date,
      1,
      timezone('utc', now())
    )
    on conflict (user_id, feature_key, request_date) do nothing;

    if found then
      return query select true, 1;
      return;
    end if;

    if input_daily_limit is null then
      update public.llm_daily_feature_usage
      set usage_count = usage_count + 1,
          last_used_at = timezone('utc', now())
      where user_id = v_user_id
        and feature_key = v_feature
        and request_date = input_request_date
      returning llm_daily_feature_usage.usage_count into v_usage_count;

      if found then
        return query select true, v_usage_count;
        return;
      end if;

      continue;
    end if;

    update public.llm_daily_feature_usage
    set usage_count = usage_count + 1,
        last_used_at = timezone('utc', now())
    where user_id = v_user_id
      and feature_key = v_feature
      and request_date = input_request_date
      and usage_count < input_daily_limit
    returning llm_daily_feature_usage.usage_count into v_usage_count;

    if found then
      return query select true, v_usage_count;
      return;
    end if;

    select coalesce(u.usage_count, 0)
    into v_usage_count
    from public.llm_daily_feature_usage u
    where u.user_id = v_user_id
      and u.feature_key = v_feature
      and u.request_date = input_request_date;

    return query select false, coalesce(v_usage_count, 0);
    return;
  end loop;
end;
$$;

create or replace function public.release_my_daily_feature_usage(
  input_feature text,
  input_request_date date
)
returns table (
  usage_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_feature text := trim(coalesce(input_feature, ''));
  v_usage_count integer;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if char_length(v_feature) = 0 then
    raise exception 'feature key is required';
  end if;

  if input_request_date is null then
    raise exception 'request date is required';
  end if;

  update public.llm_daily_feature_usage
  set usage_count = greatest(usage_count - 1, 0),
      last_used_at = timezone('utc', now())
  where user_id = v_user_id
    and feature_key = v_feature
    and request_date = input_request_date
  returning llm_daily_feature_usage.usage_count into v_usage_count;

  return query select coalesce(v_usage_count, 0);
end;
$$;

comment on function public.reserve_my_daily_feature_usage(text, date, integer) is
'Atomically reserves one daily usage slot for the signed-in user and feature, enforcing the provided plan limit.';

comment on function public.release_my_daily_feature_usage(text, date) is
'Refunds one previously reserved daily usage slot for the signed-in user and feature on failed generation paths.';

insert into public.plan_feature_entitlements (plan_code, feature_key, daily_limit, config)
values (
  'free',
  'inbody_scan',
  1,
  '{}'::jsonb
)
on conflict (plan_code, feature_key) do update
set daily_limit = excluded.daily_limit,
    config = excluded.config;

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

comment on table public.llm_daily_feature_usage is
'Per-user daily AI feature usage tracker for plan-driven limits such as AI scan. Uses feature_key + request_date.';

comment on column public.llm_daily_feature_usage.metadata is
'Optional JSON metadata for future auditing or per-request context.';

commit;
