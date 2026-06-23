-- InsightUp rich example seed data
-- Replace target_user_id with a real auth.users id before running against a
-- hosted project. The fixed id below matches the local demo owner used by the
-- richer demo seeds.
--
-- This file is idempotent: records, friends, competitions, and goals use fixed
-- UUIDs and are upserted so the seed can be re-run while tuning UI states.

begin;

do $$
declare
  target_user_id uuid := '1a34a5b4-a544-4fd7-9678-ceb9e450db7d';
  placeholder_id constant uuid := '00000000-0000-0000-0000-000000000000';

  owner_display_name text;
  owner_avatar_url text;
  owner_friend_code text;

  friend_luna_id constant uuid := '22222222-2222-4222-8222-222222222222';
  friend_kai_id constant uuid := '33333333-3333-4333-8333-333333333333';
  friend_mia_id constant uuid := '44444444-4444-4444-8444-444444444444';
  friend_noah_id constant uuid := '55555555-5555-4555-8555-555555555555';
  friend_sofia_id constant uuid := '66666666-6666-4666-8666-666666666666';
  friend_ethan_id constant uuid := '77777777-7777-4777-8777-777777777777';

  rec_owner_1 uuid := '10000000-0000-4000-8000-000000000001';
  rec_owner_2 uuid := '10000000-0000-4000-8000-000000000002';
  rec_owner_3 uuid := '10000000-0000-4000-8000-000000000003';
  rec_owner_4 uuid := '10000000-0000-4000-8000-000000000004';
  rec_owner_5 uuid := '10000000-0000-4000-8000-000000000005';
  rec_owner_6 uuid := '10000000-0000-4000-8000-000000000006';

  rec_luna_1 uuid := '20000000-0000-4000-8000-000000000001';
  rec_luna_2 uuid := '20000000-0000-4000-8000-000000000002';
  rec_kai_1 uuid := '30000000-0000-4000-8000-000000000001';
  rec_kai_2 uuid := '30000000-0000-4000-8000-000000000002';
  rec_mia_1 uuid := '40000000-0000-4000-8000-000000000001';
  rec_mia_2 uuid := '40000000-0000-4000-8000-000000000002';
  rec_noah_1 uuid := '50000000-0000-4000-8000-000000000001';
  rec_noah_2 uuid := '50000000-0000-4000-8000-000000000002';
  rec_sofia_1 uuid := '60000000-0000-4000-8000-000000000001';
  rec_sofia_2 uuid := '60000000-0000-4000-8000-000000000002';
  rec_ethan_1 uuid := '70000000-0000-4000-8000-000000000001';
  rec_ethan_2 uuid := '70000000-0000-4000-8000-000000000002';

  comp_summer_id constant uuid := '3af8817b-9fd0-44cd-8c07-7cf8eb8b361f';
  comp_strength_id constant uuid := '6fb1e380-83de-4d34-bc13-33cdb65d3aa1';
  comp_completed_id constant uuid := '8c16f7c8-4f5b-4bb6-8fe0-7e17be3d6f21';
  comp_invited_id constant uuid := '4e6f8b6c-7196-49d4-9d97-4de7716c8c41';

  member_summer_owner constant uuid := '10101010-1010-4010-8010-101010101010';
  member_summer_luna constant uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  member_summer_kai constant uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  member_summer_mia constant uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  member_strength_owner constant uuid := '20202020-2020-4020-8020-202020202020';
  member_strength_sofia constant uuid := '66666666-aaaa-4666-8666-aaaaaaaaaaaa';
  member_strength_ethan constant uuid := '77777777-aaaa-4777-8777-aaaaaaaaaaaa';
  member_strength_noah constant uuid := '55555555-aaaa-4555-8555-aaaaaaaaaaaa';
  member_completed_owner constant uuid := '30303030-3030-4030-8030-303030303030';
  member_completed_luna constant uuid := '40404040-4040-4040-8040-404040404040';
  member_invited_sofia constant uuid := '60606060-6060-4060-8060-606060606060';
  member_invited_owner constant uuid := '70707070-7070-4070-8070-707070707070';
begin
  if target_user_id = placeholder_id then
    raise notice 'Replace target_user_id in infra/supabase/seed.example.sql with a real auth.users id before running.';
    return;
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'auth.users id % does not exist', target_user_id;
  end if;

  insert into auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous,
    created_at,
    updated_at
  )
  values
    (friend_luna_id, 'authenticated', 'authenticated', 'seed-luna@example.com', timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Luna Lee"}'::jsonb, false, false, timezone('utc', now()), timezone('utc', now())),
    (friend_kai_id, 'authenticated', 'authenticated', 'seed-kai@example.com', timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Kai Chen"}'::jsonb, false, false, timezone('utc', now()), timezone('utc', now())),
    (friend_mia_id, 'authenticated', 'authenticated', 'seed-mia@example.com', timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Mia Wang"}'::jsonb, false, false, timezone('utc', now()), timezone('utc', now())),
    (friend_noah_id, 'authenticated', 'authenticated', 'seed-noah@example.com', timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Noah Lin"}'::jsonb, false, false, timezone('utc', now()), timezone('utc', now())),
    (friend_sofia_id, 'authenticated', 'authenticated', 'seed-sofia@example.com', timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sofia Hsu"}'::jsonb, false, false, timezone('utc', now()), timezone('utc', now())),
    (friend_ethan_id, 'authenticated', 'authenticated', 'seed-ethan@example.com', timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Ethan Tan"}'::jsonb, false, false, timezone('utc', now()), timezone('utc', now()))
  on conflict (id) do nothing;

  insert into public.user_profiles (user_id, display_name, avatar_url)
  values (target_user_id, 'Rich Dashboard Owner', null)
  on conflict (user_id) do nothing;

  select
    coalesce(display_name, 'Rich Dashboard Owner'),
    avatar_url,
    friend_code
  into owner_display_name, owner_avatar_url, owner_friend_code
  from public.user_profiles
  where user_id = target_user_id;

  insert into public.user_profiles (user_id, display_name, avatar_url, friend_code)
  values
    (friend_luna_id, 'Luna Lee', 'https://i.pravatar.cc/100?img=32', 'LUNALEE001'),
    (friend_kai_id, 'Kai Chen', 'https://i.pravatar.cc/100?img=12', 'KAICHEN001'),
    (friend_mia_id, 'Mia Wang', 'https://i.pravatar.cc/100?img=47', 'MIAWANG001'),
    (friend_noah_id, 'Noah Lin', null, 'NOAHLIN001'),
    (friend_sofia_id, 'Sofia Hsu', 'https://i.pravatar.cc/100?img=5', 'SOFIAHSU01'),
    (friend_ethan_id, 'Ethan Tan', 'https://i.pravatar.cc/100?img=15', 'ETHANTAN01')
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    friend_code = excluded.friend_code,
    updated_at = timezone('utc', now());

  insert into public.user_friendships (user_id, friend_user_id, created_at)
  values
    (target_user_id, friend_luna_id, timezone('utc', now()) - interval '45 days'),
    (target_user_id, friend_kai_id, timezone('utc', now()) - interval '40 days'),
    (target_user_id, friend_mia_id, timezone('utc', now()) - interval '31 days'),
    (target_user_id, friend_noah_id, timezone('utc', now()) - interval '20 days'),
    (target_user_id, friend_sofia_id, timezone('utc', now()) - interval '12 days'),
    (target_user_id, friend_ethan_id, timezone('utc', now()) - interval '7 days')
  on conflict (user_id, friend_user_id) do nothing;

  insert into public.user_dashboard_preferences (user_id, metric_order)
  values (target_user_id, array['weight', 'muscle', 'fatPercent', 'fat', 'score', 'visceralFatLevel', 'bmr', 'recommendedCalories'])
  on conflict (user_id) do update
  set
    metric_order = excluded.metric_order,
    updated_at = timezone('utc', now());

  insert into public.inbody_records (
    id,
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
    notes,
    created_at,
    updated_at,
    deleted_at
  )
  values
    (rec_owner_1, target_user_id, date '2026-01-05', 165, 29, 'male', 78, 67.8, 29.7, 13.8, 20.4, 7, 1480, 2100, true, 'manual', 'Rich seed owner baseline', timezone('utc', now()) - interval '170 days', timezone('utc', now()), null),
    (rec_owner_2, target_user_id, date '2026-02-03', 165, 29, 'male', 80, 66.9, 30.0, 13.0, 19.4, 7, 1492, 2110, true, 'manual', 'Rich seed owner trend point', timezone('utc', now()) - interval '141 days', timezone('utc', now()), null),
    (rec_owner_3, target_user_id, date '2026-03-04', 165, 29, 'male', 82, 66.1, 30.4, 12.1, 18.3, 6, 1508, 2140, true, 'manual', 'Rich seed owner trend point', timezone('utc', now()) - interval '112 days', timezone('utc', now()), null),
    (rec_owner_4, target_user_id, date '2026-04-02', 165, 29, 'male', 81, 65.6, 30.2, 12.2, 18.6, 6, 1498, 2120, false, 'manual', 'Excluded record to test chart filtering', timezone('utc', now()) - interval '83 days', timezone('utc', now()), null),
    (rec_owner_5, target_user_id, date '2026-05-08', 165, 29, 'male', 84, 64.9, 30.9, 10.9, 16.8, 5, 1525, 2160, true, 'manual', 'Rich seed owner latest positive trend', timezone('utc', now()) - interval '47 days', timezone('utc', now()), null),
    (rec_owner_6, target_user_id, date '2026-06-12', 165, 29, 'male', 85, 64.4, 31.3, 10.4, 16.1, 5, 1538, 2180, true, 'manual', 'Rich seed owner latest record', timezone('utc', now()) - interval '10 days', timezone('utc', now()), null),
    (rec_luna_1, friend_luna_id, date '2026-04-01', 164, 27, 'female', 79, 59.4, 28.6, 11.1, 18.2, 5, 1330, 1850, true, 'manual', 'Friend baseline for Luna', timezone('utc', now()), timezone('utc', now()), null),
    (rec_luna_2, friend_luna_id, date '2026-06-01', 164, 27, 'female', 82, 58.7, 29.1, 10.6, 17.2, 5, 1345, 1860, true, 'manual', 'Friend latest for Luna', timezone('utc', now()), timezone('utc', now()), null),
    (rec_kai_1, friend_kai_id, date '2026-04-20', 170, 29, 'male', 74, 72.0, 31.2, 14.0, 19.4, 8, 1580, 2300, true, 'manual', 'Friend baseline for Kai', timezone('utc', now()), timezone('utc', now()), null),
    (rec_kai_2, friend_kai_id, date '2026-06-06', 170, 29, 'male', 75, 70.0, 31.9, 13.1, 18.0, 7, 1575, 2290, true, 'manual', 'Friend latest for Kai', timezone('utc', now()), timezone('utc', now()), null),
    (rec_mia_1, friend_mia_id, date '2026-04-15', 161, 30, 'female', 75, 66.0, 26.0, 18.4, 25.0, 7, 1360, 1880, true, 'manual', 'Friend baseline for Mia', timezone('utc', now()), timezone('utc', now()), null),
    (rec_mia_2, friend_mia_id, date '2026-06-05', 161, 30, 'female', 77, 64.8, 26.8, 17.1, 23.8, 7, 1372, 1890, true, 'manual', 'Friend latest for Mia', timezone('utc', now()), timezone('utc', now()), null),
    (rec_noah_1, friend_noah_id, date '2026-04-10', 176, 32, 'male', 80, 82.0, 34.0, 16.0, 19.5, 7, 1680, 2450, true, 'manual', 'Friend baseline for Noah', timezone('utc', now()), timezone('utc', now()), null),
    (rec_noah_2, friend_noah_id, date '2026-06-07', 176, 32, 'male', 76, 84.5, 32.8, 18.9, 22.4, 9, 1695, 2470, true, 'manual', 'Friend regression for Noah', timezone('utc', now()), timezone('utc', now()), null),
    (rec_sofia_1, friend_sofia_id, date '2026-05-01', 158, 26, 'female', 72, 55.2, 24.8, 14.3, 25.9, 6, 1245, 1730, true, 'manual', 'Friend baseline for Sofia', timezone('utc', now()), timezone('utc', now()), null),
    (rec_sofia_2, friend_sofia_id, date '2026-06-09', 158, 26, 'female', 80, 54.1, 25.9, 12.6, 23.3, 5, 1280, 1760, true, 'manual', 'Friend latest for Sofia', timezone('utc', now()), timezone('utc', now()), null),
    (rec_ethan_1, friend_ethan_id, date '2026-05-10', 182, 34, 'male', 86, 78.5, 36.4, 10.8, 13.8, 4, 1795, 2630, true, 'manual', 'Friend baseline for Ethan', timezone('utc', now()), timezone('utc', now()), null),
    (rec_ethan_2, friend_ethan_id, date '2026-06-08', 182, 34, 'male', 88, 79.4, 37.2, 10.4, 13.1, 4, 1810, 2660, true, 'manual', 'Friend latest for Ethan', timezone('utc', now()), timezone('utc', now()), null)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    recorded_at = excluded.recorded_at,
    height = excluded.height,
    age = excluded.age,
    gender = excluded.gender,
    score = excluded.score,
    weight = excluded.weight,
    muscle = excluded.muscle,
    fat = excluded.fat,
    fat_percent = excluded.fat_percent,
    visceral_fat_level = excluded.visceral_fat_level,
    bmr = excluded.bmr,
    recommended_calories = excluded.recommended_calories,
    is_included_in_charts = excluded.is_included_in_charts,
    source_type = excluded.source_type,
    notes = excluded.notes,
    deleted_at = null,
    updated_at = excluded.updated_at;

  insert into public.inbody_segments (record_id, part_key, part_name, muscle, fat, muscle_ratio, fat_ratio)
  values
    (rec_owner_1, 'leftArm', 'Left Arm', 2.72, 0.72, 92.4, 128.0),
    (rec_owner_1, 'rightArm', 'Right Arm', 2.95, 0.66, 100.2, 116.5),
    (rec_owner_1, 'trunk', 'Trunk', 22.8, 6.4, 98.2, 161.0),
    (rec_owner_1, 'leftLeg', 'Left Leg', 8.05, 2.2, 99.0, 131.2),
    (rec_owner_1, 'rightLeg', 'Right Leg', 8.08, 2.1, 99.3, 129.8),
    (rec_owner_2, 'leftArm', 'Left Arm', 2.78, 0.68, 94.8, 124.4),
    (rec_owner_2, 'rightArm', 'Right Arm', 3.02, 0.62, 103.0, 111.8),
    (rec_owner_2, 'trunk', 'Trunk', 23.1, 6.1, 99.5, 156.4),
    (rec_owner_2, 'leftLeg', 'Left Leg', 8.16, 2.0, 100.8, 126.0),
    (rec_owner_2, 'rightLeg', 'Right Leg', 8.18, 2.0, 101.0, 125.7),
    (rec_owner_3, 'leftArm', 'Left Arm', 2.84, 0.60, 96.8, 119.5),
    (rec_owner_3, 'rightArm', 'Right Arm', 3.15, 0.50, 107.4, 97.0),
    (rec_owner_3, 'trunk', 'Trunk', 23.7, 5.9, 101.4, 154.5),
    (rec_owner_3, 'leftLeg', 'Left Leg', 8.34, 1.9, 102.5, 123.8),
    (rec_owner_3, 'rightLeg', 'Right Leg', 8.37, 1.9, 102.8, 123.5),
    (rec_owner_4, 'leftArm', 'Left Arm', 2.79, 0.62, 95.4, 119.9),
    (rec_owner_4, 'rightArm', 'Right Arm', 3.04, 0.54, 104.2, 99.3),
    (rec_owner_4, 'trunk', 'Trunk', 23.6, 6.0, 101.2, 157.3),
    (rec_owner_4, 'leftLeg', 'Left Leg', 8.29, 2.0, 102.1, 126.9),
    (rec_owner_4, 'rightLeg', 'Right Leg', 8.27, 1.9, 101.8, 126.2),
    (rec_owner_5, 'leftArm', 'Left Arm', 2.90, 0.52, 99.2, 104.6),
    (rec_owner_5, 'rightArm', 'Right Arm', 3.20, 0.48, 109.0, 92.4),
    (rec_owner_5, 'trunk', 'Trunk', 24.1, 5.4, 103.2, 141.2),
    (rec_owner_5, 'leftLeg', 'Left Leg', 8.48, 1.7, 104.3, 112.6),
    (rec_owner_5, 'rightLeg', 'Right Leg', 8.50, 1.7, 104.5, 112.2),
    (rec_owner_6, 'leftArm', 'Left Arm', 2.96, 0.50, 101.0, 101.8),
    (rec_owner_6, 'rightArm', 'Right Arm', 3.26, 0.45, 111.0, 88.5),
    (rec_owner_6, 'trunk', 'Trunk', 24.4, 5.1, 104.8, 134.0),
    (rec_owner_6, 'leftLeg', 'Left Leg', 8.60, 1.6, 105.8, 107.5),
    (rec_owner_6, 'rightLeg', 'Right Leg', 8.63, 1.6, 106.1, 107.0)
  on conflict (record_id, part_key) do update
  set
    part_name = excluded.part_name,
    muscle = excluded.muscle,
    fat = excluded.fat,
    muscle_ratio = excluded.muscle_ratio,
    fat_ratio = excluded.fat_ratio,
    updated_at = timezone('utc', now());

  insert into public.competitions (id, owner_id, name, target_date, status, created_at, updated_at, deleted_at)
  values
    (comp_summer_id, target_user_id, 'Summer Recomposition League', date '2026-08-08', 'active', timezone('utc', now()) - interval '12 days', timezone('utc', now()), null),
    (comp_strength_id, target_user_id, 'July Strength Sprint', date '2026-07-15', 'active', timezone('utc', now()) - interval '5 days', timezone('utc', now()), null),
    (comp_completed_id, target_user_id, 'May Finish-Line Check', date '2026-05-31', 'completed', timezone('utc', now()) - interval '60 days', timezone('utc', now()), null),
    (comp_invited_id, friend_sofia_id, 'Invite-Only Fat Loss Push', date '2026-08-31', 'active', timezone('utc', now()) - interval '1 day', timezone('utc', now()), null)
  on conflict (id) do update
  set
    owner_id = excluded.owner_id,
    name = excluded.name,
    target_date = excluded.target_date,
    status = excluded.status,
    deleted_at = null,
    updated_at = excluded.updated_at;

  insert into public.competition_members (
    id,
    competition_id,
    user_id,
    display_name,
    avatar_url,
    friend_code,
    role,
    status,
    invited_by_user_id,
    joined_at,
    deleted_at
  )
  values
    (member_summer_owner, comp_summer_id, target_user_id, owner_display_name, owner_avatar_url, owner_friend_code, 'owner', 'accepted', target_user_id, timezone('utc', now()) - interval '12 days', null),
    (member_summer_luna, comp_summer_id, friend_luna_id, 'Luna Lee', 'https://i.pravatar.cc/100?img=32', 'LUNALEE001', 'participant', 'accepted', target_user_id, timezone('utc', now()) - interval '11 days', null),
    (member_summer_kai, comp_summer_id, friend_kai_id, 'Kai Chen', 'https://i.pravatar.cc/100?img=12', 'KAICHEN001', 'participant', 'accepted', target_user_id, timezone('utc', now()) - interval '10 days', null),
    (member_summer_mia, comp_summer_id, friend_mia_id, 'Mia Wang', 'https://i.pravatar.cc/100?img=47', 'MIAWANG001', 'participant', 'accepted', target_user_id, timezone('utc', now()) - interval '9 days', null),
    (member_strength_owner, comp_strength_id, target_user_id, owner_display_name, owner_avatar_url, owner_friend_code, 'owner', 'accepted', target_user_id, timezone('utc', now()) - interval '5 days', null),
    (member_strength_sofia, comp_strength_id, friend_sofia_id, 'Sofia Hsu', 'https://i.pravatar.cc/100?img=5', 'SOFIAHSU01', 'participant', 'accepted', target_user_id, timezone('utc', now()) - interval '4 days', null),
    (member_strength_ethan, comp_strength_id, friend_ethan_id, 'Ethan Tan', 'https://i.pravatar.cc/100?img=15', 'ETHANTAN01', 'participant', 'accepted', target_user_id, timezone('utc', now()) - interval '3 days', null),
    (member_strength_noah, comp_strength_id, friend_noah_id, 'Noah Lin', null, 'NOAHLIN001', 'participant', 'accepted', target_user_id, timezone('utc', now()) - interval '2 days', null),
    (member_completed_owner, comp_completed_id, target_user_id, owner_display_name, owner_avatar_url, owner_friend_code, 'owner', 'accepted', target_user_id, timezone('utc', now()) - interval '45 days', null),
    (member_completed_luna, comp_completed_id, friend_luna_id, 'Luna Lee', 'https://i.pravatar.cc/100?img=32', 'LUNALEE001', 'participant', 'accepted', target_user_id, timezone('utc', now()) - interval '44 days', null),
    (member_invited_sofia, comp_invited_id, friend_sofia_id, 'Sofia Hsu', 'https://i.pravatar.cc/100?img=5', 'SOFIAHSU01', 'owner', 'accepted', friend_sofia_id, timezone('utc', now()) - interval '1 day', null),
    (member_invited_owner, comp_invited_id, target_user_id, owner_display_name, owner_avatar_url, owner_friend_code, 'participant', 'invited', friend_sofia_id, null, null)
  on conflict (competition_id, user_id) where deleted_at is null do update
  set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    friend_code = excluded.friend_code,
    role = excluded.role,
    status = excluded.status,
    invited_by_user_id = excluded.invited_by_user_id,
    joined_at = excluded.joined_at,
    updated_at = timezone('utc', now());

  insert into public.user_personal_goals (
    id,
    user_id,
    title,
    start_record_id,
    competition_id,
    competition_member_id,
    metric_key,
    start_value,
    target_value,
    unit,
    target_date,
    target_date_locked,
    created_at,
    updated_at,
    deleted_at
  )
  values
    ('01010101-0101-4101-8101-010101010101', target_user_id, 'Lean summer cut', rec_owner_1, null, null, 'weight', 67.8, 63.8, 'kg', date '2026-09-01', false, timezone('utc', now()) - interval '30 days', timezone('utc', now()), null),
    ('02020202-0202-4202-8202-020202020202', target_user_id, 'Lean summer cut', rec_owner_1, null, null, 'fatPercent', 20.4, 15.8, '%', date '2026-09-01', false, timezone('utc', now()) - interval '30 days', timezone('utc', now()), null),
    ('03030303-0303-4303-8303-030303030303', target_user_id, 'Muscle gain block', rec_owner_3, null, null, 'muscle', 30.4, 32.0, 'kg', date '2026-10-15', false, timezone('utc', now()) - interval '15 days', timezone('utc', now()), null),
    ('04040404-0404-4404-8404-040404040404', target_user_id, 'May finish-line check', rec_owner_1, null, null, 'score', 78, 83, 'pts', date '2026-05-31', false, timezone('utc', now()) - interval '80 days', timezone('utc', now()), null),
    ('11111111-1111-4111-8111-111111111111', target_user_id, 'Summer recomposition', rec_owner_1, comp_summer_id, member_summer_owner, 'weight', 67.8, 63.8, 'kg', date '2026-08-08', true, timezone('utc', now()) - interval '12 days', timezone('utc', now()), null),
    ('12121212-1212-4121-8121-121212121212', target_user_id, 'Summer recomposition', rec_owner_1, comp_summer_id, member_summer_owner, 'fatPercent', 20.4, 15.8, '%', date '2026-08-08', true, timezone('utc', now()) - interval '12 days', timezone('utc', now()), null),
    ('13131313-1313-4131-8131-131313131313', target_user_id, 'July Strength Sprint', rec_owner_3, comp_strength_id, member_strength_owner, 'muscle', 30.4, 31.8, 'kg', date '2026-07-15', true, timezone('utc', now()) - interval '5 days', timezone('utc', now()), null),
    ('14141414-1414-4141-8141-141414141414', target_user_id, 'July Strength Sprint', rec_owner_3, comp_strength_id, member_strength_owner, 'score', 82, 86, 'pts', date '2026-07-15', true, timezone('utc', now()) - interval '5 days', timezone('utc', now()), null),
    ('15151515-1515-4151-8151-151515151515', target_user_id, 'May finish-line check', rec_owner_1, comp_completed_id, member_completed_owner, 'weight', 67.8, 65.0, 'kg', date '2026-05-31', true, timezone('utc', now()) - interval '45 days', timezone('utc', now()), null),
    ('22222222-2222-4112-8112-222222222222', friend_luna_id, 'Summer recomposition', rec_luna_1, comp_summer_id, member_summer_luna, 'muscle', 28.6, 29.5, 'kg', date '2026-08-08', true, timezone('utc', now()), timezone('utc', now()), null),
    ('33333333-3333-4113-8113-333333333333', friend_kai_id, 'Summer recomposition', rec_kai_1, comp_summer_id, member_summer_kai, 'weight', 72.0, 68.0, 'kg', date '2026-08-08', true, timezone('utc', now()), timezone('utc', now()), null),
    ('44444444-4444-4114-8114-444444444444', friend_mia_id, 'Summer recomposition', rec_mia_1, comp_summer_id, member_summer_mia, 'fatPercent', 25.0, 22.0, '%', date '2026-08-08', true, timezone('utc', now()), timezone('utc', now()), null),
    ('55555555-5555-4115-8115-555555555555', friend_sofia_id, 'July Strength Sprint', rec_sofia_1, comp_strength_id, member_strength_sofia, 'fat', 14.3, 12.5, 'kg', date '2026-07-15', true, timezone('utc', now()), timezone('utc', now()), null),
    ('66666666-6666-4116-8116-666666666666', friend_ethan_id, 'July Strength Sprint', rec_ethan_1, comp_strength_id, member_strength_ethan, 'score', 86, 89, 'pts', date '2026-07-15', true, timezone('utc', now()), timezone('utc', now()), null),
    ('77777777-7777-4117-8117-777777777777', friend_noah_id, 'July Strength Sprint', rec_noah_1, comp_strength_id, member_strength_noah, 'fatPercent', 19.5, 18.5, '%', date '2026-07-15', true, timezone('utc', now()), timezone('utc', now()), null),
    ('88888888-8888-4118-8118-888888888888', friend_luna_id, 'May finish-line check', rec_luna_1, comp_completed_id, member_completed_luna, 'weight', 59.4, 59.0, 'kg', date '2026-05-31', true, timezone('utc', now()) - interval '45 days', timezone('utc', now()), null)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    title = excluded.title,
    start_record_id = excluded.start_record_id,
    competition_id = excluded.competition_id,
    competition_member_id = excluded.competition_member_id,
    metric_key = excluded.metric_key,
    start_value = excluded.start_value,
    target_value = excluded.target_value,
    unit = excluded.unit,
    target_date = excluded.target_date,
    target_date_locked = excluded.target_date_locked,
    deleted_at = null,
    updated_at = excluded.updated_at;
end
$$;

commit;
