begin;

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

create index if not exists user_friendships_friend_user_id_idx
  on public.user_friendships (friend_user_id);

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

alter table public.user_profiles enable row level security;
alter table public.user_friendships enable row level security;

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

comment on table public.user_profiles is
'Per-user sharing profile used for friend lookup and safe display metadata.';

comment on column public.user_profiles.friend_code is
'Stable 10-character code that a user can share so others can add them as a friend.';

comment on table public.user_friendships is
'Directional friend list. A row means the owner chose to follow the target friend.';

commit;