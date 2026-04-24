-- InsightUp example seed data
-- Replace the placeholder user id before running.
-- This file is intentionally safe-by-default and will do nothing if you forget
-- to replace the placeholder.
-- Note: the second sample record is intentionally inserted with
-- is_included_in_charts = false, so the main chart will only plot the
-- first record until that flag is changed.

begin;

do $$
declare
  target_user_id uuid := '1a34a5b4-a544-4fd7-9678-ceb9e450db7d';
  placeholder_id constant uuid := '00000000-0000-0000-0000-000000000000';
  record_1 uuid;
  record_2 uuid;
begin
  if target_user_id = placeholder_id then
    raise notice 'Replace target_user_id in supabase/seed.example.sql with a real auth.users id before running.';
    return;
  end if;

  if not exists (
    select 1
    from auth.users
    where id = target_user_id
  ) then
    raise exception 'auth.users id % does not exist', target_user_id;
  end if;

  insert into public.inbody_records (
    user_id,
    recorded_at,
    height,
    age,
    gender,
    score,
    weight,
    muscle,
    fat,
    fat_percent,
    visceral_fat_level,
    bmr,
    recommended_calories,
    is_included_in_charts,
    source_type,
    notes
  )
  values (
    target_user_id,
    date '2026-01-19',
    165,
    29,
    'male',
    81,
    66.1,
    30.5,
    11.9,
    18.0,
    6,
    1508,
    2140,
    true,
    'manual',
    'Seed sample record 1'
  )
  returning id into record_1;

  insert into public.inbody_segments (record_id, part_key, part_name, muscle, fat, muscle_ratio, fat_ratio)
  values
    (record_1, 'leftArm', 'Left Arm', 2.84, 0.6, 96.8, 119.5),
    (record_1, 'rightArm', 'Right Arm', 3.15, 0.5, 107.4, 97.0),
    (record_1, 'trunk', 'Trunk', 23.7, 5.9, 101.4, 154.5),
    (record_1, 'leftLeg', 'Left Leg', 8.34, 1.9, 102.5, 123.8),
    (record_1, 'rightLeg', 'Right Leg', 8.37, 1.9, 102.8, 123.5);

  insert into public.inbody_records (
    user_id,
    recorded_at,
    height,
    age,
    gender,
    score,
    weight,
    muscle,
    fat,
    fat_percent,
    visceral_fat_level,
    bmr,
    recommended_calories,
    is_included_in_charts,
    source_type,
    notes
  )
  values (
    target_user_id,
    date '2026-04-01',
    165,
    29,
    'male',
    80,
    65.6,
    30.2,
    12.1,
    18.5,
    6,
    1498,
    2120,
    false,
    'manual',
    'Seed sample record 2, excluded from charts'
  )
  returning id into record_2;

  insert into public.inbody_segments (record_id, part_key, part_name, muscle, fat, muscle_ratio, fat_ratio)
  values
    (record_2, 'leftArm', 'Left Arm', 2.79, 0.6, 95.4, 119.9),
    (record_2, 'rightArm', 'Right Arm', 3.04, 0.5, 104.2, 99.3),
    (record_2, 'trunk', 'Trunk', 23.6, 6.0, 101.2, 157.3),
    (record_2, 'leftLeg', 'Left Leg', 8.29, 2.0, 102.1, 126.9),
    (record_2, 'rightLeg', 'Right Leg', 8.27, 1.9, 101.8, 126.2);
end
$$;

commit;
