begin;

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

commit;
