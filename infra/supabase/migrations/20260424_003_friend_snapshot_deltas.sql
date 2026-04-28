begin;

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

commit;