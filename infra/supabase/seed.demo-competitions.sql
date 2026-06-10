-- InsightUp demo competition seed data
-- Use this in Supabase SQL Editor or as a local seed for development only.
-- It is intentionally idempotent so you can re-run it without creating duplicates.

begin;

do $$
declare
  v_competition_id constant uuid := '3af8817b-9fd0-44cd-8c07-7cf8eb8b361f';
  v_owner_id constant uuid := '1a34a5b4-a544-4fd7-9678-ceb9e450db7d';

  v_luna_id constant uuid := '22222222-2222-4222-8222-222222222222';
  v_kai_id constant uuid := '33333333-3333-4333-8333-333333333333';
  v_mia_id constant uuid := '44444444-4444-4444-8444-444444444444';

  v_luna_member_id constant uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_kai_member_id constant uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_mia_member_id constant uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  v_luna_start_record_id constant uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_luna_latest_record_id constant uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_kai_start_record_id constant uuid := 'abababab-abab-4aba-8aba-abababababab';
  v_kai_latest_record_id constant uuid := 'bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc';
  v_mia_start_record_id constant uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  v_mia_latest_record_id constant uuid := '99999999-9999-4999-8999-999999999999';

begin
  -- Demo auth users.
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
    (
      v_luna_id,
      'authenticated',
      'authenticated',
      'luna.lee.demo@example.com',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Luna Lee"}'::jsonb,
      false,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_kai_id,
      'authenticated',
      'authenticated',
      'kai.chen.demo@example.com',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Kai Chen"}'::jsonb,
      false,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_mia_id,
      'authenticated',
      'authenticated',
      'mia.wang.demo@example.com',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Mia Wang"}'::jsonb,
      false,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    )
  on conflict (id) do update
  set
    email = excluded.email,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    is_sso_user = excluded.is_sso_user,
    is_anonymous = excluded.is_anonymous,
    updated_at = excluded.updated_at;

  -- Demo profiles with visible avatars for stack preview.
  insert into public.user_profiles (user_id, display_name, avatar_url, friend_code)
  values
    (
      v_luna_id,
      'Luna Lee',
      'https://i.pravatar.cc/100?img=32',
      'LUNALEE001'
    ),
    (
      v_kai_id,
      'Kai Chen',
      'https://i.pravatar.cc/100?img=12',
      'KAICHEN001'
    ),
    (
      v_mia_id,
      'Mia Wang',
      'https://i.pravatar.cc/100?img=47',
      'MIAWANG001'
    )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    friend_code = excluded.friend_code,
    updated_at = timezone('utc', now());

  -- Use the existing competition and add demo participants.
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
    joined_at
  )
  values
    (
      v_luna_member_id,
      v_competition_id,
      v_luna_id,
      'Luna Lee',
      'https://i.pravatar.cc/100?img=32',
      'LUNALEE001',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now())
    ),
    (
      v_kai_member_id,
      v_competition_id,
      v_kai_id,
      'Kai Chen',
      'https://i.pravatar.cc/100?img=12',
      'KAICHEN001',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now())
    ),
    (
      v_mia_member_id,
      v_competition_id,
      v_mia_id,
      'Mia Wang',
      'https://i.pravatar.cc/100?img=47',
      'MIAWANG001',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now())
    )
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

  -- Demo InBody records that make the leaderboard visibly different.
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
    updated_at
  )
  values
    (
      v_luna_start_record_id,
      v_luna_id,
      date '2026-04-01',
      164,
      27,
      'female',
      79,
      59.4,
      28.6,
      11.1,
      18.2,
      5,
      1330,
      1850,
      true,
      'manual',
      'Demo baseline record for Luna',
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_luna_latest_record_id,
      v_luna_id,
      date '2026-06-01',
      164,
      27,
      'female',
      82,
      58.7,
      29.1,
      10.6,
      17.2,
      5,
      1345,
      1860,
      true,
      'manual',
      'Demo latest record for Luna',
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_kai_start_record_id,
      v_kai_id,
      date '2026-04-20',
      170,
      29,
      'male',
      74,
      72.0,
      31.2,
      14.0,
      19.4,
      8,
      1580,
      2300,
      true,
      'manual',
      'Demo baseline record for Kai',
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_kai_latest_record_id,
      v_kai_id,
      date '2026-06-06',
      170,
      29,
      'male',
      75,
      70.0,
      31.9,
      13.1,
      18.0,
      7,
      1575,
      2290,
      true,
      'manual',
      'Demo latest record for Kai',
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_mia_start_record_id,
      v_mia_id,
      date '2026-04-15',
      161,
      30,
      'female',
      75,
      66.0,
      26.0,
      18.4,
      25.0,
      7,
      1360,
      1880,
      true,
      'manual',
      'Demo baseline record for Mia',
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_mia_latest_record_id,
      v_mia_id,
      date '2026-06-05',
      161,
      30,
      'female',
      77,
      64.8,
      26.8,
      17.1,
      23.8,
      7,
      1372,
      1890,
      true,
      'manual',
      'Demo latest record for Mia',
      timezone('utc', now()),
      timezone('utc', now())
    )
  on conflict (id) do update
  set
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
    updated_at = excluded.updated_at;

  -- Demo goals linked to the competition so the leaderboard has visible progress.
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
    updated_at
  )
  values
    (
      '11111111-1111-4111-8111-111111111111',
      v_luna_id,
      'Summer cut',
      v_luna_start_record_id,
      v_competition_id,
      v_luna_member_id,
      'weight',
      59.4,
      58.4,
      'kg',
      date '2026-08-08',
      true,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      '22222222-2222-4112-8112-222222222222',
      v_luna_id,
      'Summer cut',
      v_luna_start_record_id,
      v_competition_id,
      v_luna_member_id,
      'muscle',
      28.6,
      29.5,
      'kg',
      date '2026-08-08',
      true,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      '44444444-4444-4114-8114-444444444444',
      v_kai_id,
      'Build strength',
      v_kai_start_record_id,
      v_competition_id,
      v_kai_member_id,
      'weight',
      72.0,
      68.0,
      'kg',
      date '2026-08-08',
      true,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      '33333333-3333-4113-8113-333333333333',
      v_mia_id,
      'Lean down',
      v_mia_start_record_id,
      v_competition_id,
      v_mia_member_id,
      'fatPercent',
      25.0,
      22.0,
      '%',
      date '2026-08-08',
      true,
      timezone('utc', now()),
      timezone('utc', now())
    )
  on conflict (id) do update
  set
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
    updated_at = excluded.updated_at;
end
$$;

commit;
