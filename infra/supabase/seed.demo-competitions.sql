-- InsightUp demo friends and competition seed data
-- Use this in Supabase SQL Editor or as a local seed for development only.
-- It is intentionally idempotent so you can re-run it without creating duplicates.

begin;

do $$
declare
  v_owner_id constant uuid := '1a34a5b4-a544-4fd7-9678-ceb9e450db7d';

  v_competition_id constant uuid := '3af8817b-9fd0-44cd-8c07-7cf8eb8b361f';
  v_second_competition_id constant uuid := '6fb1e380-83de-4d34-bc13-33cdb65d3aa1';
  v_completed_competition_id constant uuid := '8c16f7c8-4f5b-4bb6-8fe0-7e17be3d6f21';
  v_invited_competition_id constant uuid := '4e6f8b6c-7196-49d4-9d97-4de7716c8c41';

  v_luna_id constant uuid := '22222222-2222-4222-8222-222222222222';
  v_kai_id constant uuid := '33333333-3333-4333-8333-333333333333';
  v_mia_id constant uuid := '44444444-4444-4444-8444-444444444444';
  v_noah_id constant uuid := '55555555-5555-4555-8555-555555555555';
  v_sofia_id constant uuid := '66666666-6666-4666-8666-666666666666';
  v_ethan_id constant uuid := '77777777-7777-4777-8777-777777777777';
  v_rina_id constant uuid := '88888888-8888-4888-8888-888888888888';
  v_omar_id constant uuid := '99999999-1111-4999-8999-111111111111';

  v_owner_member_id constant uuid := '10101010-1010-4010-8010-101010101010';
  v_luna_member_id constant uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_kai_member_id constant uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_mia_member_id constant uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_noah_member_id constant uuid := '55555555-aaaa-4555-8555-aaaaaaaaaaaa';

  v_second_owner_member_id constant uuid := '20202020-2020-4020-8020-202020202020';
  v_sofia_member_id constant uuid := '66666666-aaaa-4666-8666-aaaaaaaaaaaa';
  v_ethan_member_id constant uuid := '77777777-aaaa-4777-8777-aaaaaaaaaaaa';
  v_rina_member_id constant uuid := '88888888-aaaa-4888-8888-aaaaaaaaaaaa';
  v_omar_member_id constant uuid := '99999999-aaaa-4999-8999-aaaaaaaaaaaa';
  v_completed_owner_member_id constant uuid := '30303030-3030-4030-8030-303030303030';
  v_completed_luna_member_id constant uuid := '40404040-4040-4040-8040-404040404040';
  v_completed_kai_member_id constant uuid := '50505050-5050-4050-8050-505050505050';
  v_invited_sofia_member_id constant uuid := '60606060-6060-4060-8060-606060606060';
  v_invited_owner_member_id constant uuid := '70707070-7070-4070-8070-707070707070';
  v_invited_ethan_member_id constant uuid := '80808080-8080-4080-8080-808080808080';

  v_luna_start_record_id constant uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_luna_latest_record_id constant uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_kai_start_record_id constant uuid := 'abababab-abab-4aba-8aba-abababababab';
  v_kai_latest_record_id constant uuid := 'bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc';
  v_mia_start_record_id constant uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  v_mia_latest_record_id constant uuid := '99999999-9999-4999-8999-999999999999';
  v_noah_start_record_id constant uuid := '55555555-dddd-4555-8555-dddddddddddd';
  v_noah_latest_record_id constant uuid := '55555555-eeee-4555-8555-eeeeeeeeeeee';
  v_sofia_start_record_id constant uuid := '66666666-dddd-4666-8666-dddddddddddd';
  v_sofia_latest_record_id constant uuid := '66666666-eeee-4666-8666-eeeeeeeeeeee';
  v_ethan_start_record_id constant uuid := '77777777-dddd-4777-8777-dddddddddddd';
  v_ethan_latest_record_id constant uuid := '77777777-eeee-4777-8777-eeeeeeeeeeee';
  v_rina_only_record_id constant uuid := '88888888-dddd-4888-8888-dddddddddddd';
  v_rina_latest_record_id constant uuid := '88888888-eeee-4888-8888-eeeeeeeeeeee';
  v_omar_start_record_id constant uuid := '99999999-dddd-4999-8999-dddddddddddd';
  v_omar_latest_record_id constant uuid := '99999999-eeee-4999-8999-eeeeeeeeeeee';

  v_owner_display_name text;
  v_owner_avatar_url text;
  v_owner_friend_code text;
begin
  -- Ensure the fixed demo owner exists in clean local databases without
  -- overwriting a real account that already uses this id.
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
  values (
    v_owner_id,
    'authenticated',
    'authenticated',
    'demo.owner@example.com',
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Owner"}'::jsonb,
    false,
    false,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do nothing;

  insert into public.user_profiles (user_id, display_name, avatar_url, friend_code)
  values (v_owner_id, 'Demo Owner', null, 'DEMOOWNER1')
  on conflict (user_id) do nothing;

  select
    coalesce(p.display_name, 'Demo Owner'),
    p.avatar_url,
    p.friend_code
  into v_owner_display_name, v_owner_avatar_url, v_owner_friend_code
  from public.user_profiles p
  where p.user_id = v_owner_id;

  -- Demo competitions are created here so the seed can be run from a clean dev database.
  insert into public.competitions (
    id,
    owner_id,
    name,
    target_date,
    status,
    created_at,
    updated_at
  )
  values
    (
      v_competition_id,
      v_owner_id,
      '一起變好',
      date '2026-08-08',
      'active',
      timezone('utc', now()) - interval '12 days',
      timezone('utc', now())
    ),
    (
      v_second_competition_id,
      v_owner_id,
      '夏日大作戰',
      date '2026-07-15',
      'active',
      timezone('utc', now()) - interval '4 days',
      timezone('utc', now())
    ),
    (
      v_completed_competition_id,
      v_owner_id,
      '五月前哨站',
      date '2026-05-31',
      'completed',
      timezone('utc', now()) - interval '45 days',
      timezone('utc', now()) - interval '11 days'
    )
  on conflict (id) do update
  set
    name = excluded.name,
    target_date = excluded.target_date,
    status = excluded.status,
    deleted_at = null,
    updated_at = timezone('utc', now());

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
    ),
    (
      v_noah_id,
      'authenticated',
      'authenticated',
      'noah.lin.demo@example.com',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Noah Lin"}'::jsonb,
      false,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_sofia_id,
      'authenticated',
      'authenticated',
      'sofia.hsu.demo@example.com',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Sofia Hsu"}'::jsonb,
      false,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_ethan_id,
      'authenticated',
      'authenticated',
      'ethan.tan.demo@example.com',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Ethan Tan"}'::jsonb,
      false,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_rina_id,
      'authenticated',
      'authenticated',
      'rina.kim.demo@example.com',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Rina Kim"}'::jsonb,
      false,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_omar_id,
      'authenticated',
      'authenticated',
      'omar.ali.demo@example.com',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Omar Ali"}'::jsonb,
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

  -- Demo profiles. Noah and Omar intentionally have no avatar so fallback states can be checked.
  insert into public.user_profiles (user_id, display_name, avatar_url, friend_code)
  values
    (v_luna_id, 'Luna Lee', 'https://i.pravatar.cc/100?img=32', 'LUNALEE001'),
    (v_kai_id, 'Kai Chen', 'https://i.pravatar.cc/100?img=12', 'KAICHEN001'),
    (v_mia_id, 'Mia Wang', 'https://i.pravatar.cc/100?img=47', 'MIAWANG001'),
    (v_noah_id, 'Noah Lin', null, 'NOAHLIN001'),
    (v_sofia_id, 'Sofia Hsu', 'https://i.pravatar.cc/100?img=5', 'SOFIAHSU01'),
    (v_ethan_id, 'Ethan Tan', 'https://i.pravatar.cc/100?img=15', 'ETHANTAN01'),
    (v_rina_id, 'Rina Kim', 'https://i.pravatar.cc/100?img=25', 'RINAKIM001'),
    (v_omar_id, 'Omar Ali', null, 'OMARALI001')
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    friend_code = excluded.friend_code,
    updated_at = timezone('utc', now());

  -- Directional demo friendships for the owner account.
  insert into public.user_friendships (user_id, friend_user_id, created_at)
  values
    (v_owner_id, v_luna_id, timezone('utc', now()) - interval '28 days'),
    (v_owner_id, v_kai_id, timezone('utc', now()) - interval '26 days'),
    (v_owner_id, v_mia_id, timezone('utc', now()) - interval '24 days'),
    (v_owner_id, v_noah_id, timezone('utc', now()) - interval '20 days'),
    (v_owner_id, v_sofia_id, timezone('utc', now()) - interval '13 days'),
    (v_owner_id, v_ethan_id, timezone('utc', now()) - interval '9 days'),
    (v_owner_id, v_rina_id, timezone('utc', now()) - interval '7 days'),
    (v_owner_id, v_omar_id, timezone('utc', now()) - interval '2 days')
  on conflict (user_id, friend_user_id) do nothing;

  -- A separate active competition owned by a friend where the demo owner is still invited.
  insert into public.competitions (
    id,
    owner_id,
    name,
    target_date,
    status,
    created_at,
    updated_at
  )
  values (
    v_invited_competition_id,
    v_sofia_id,
    '六月夥伴邀請賽',
    date '2026-08-31',
    'active',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now())
  )
  on conflict (id) do update
  set
    owner_id = excluded.owner_id,
    name = excluded.name,
    target_date = excluded.target_date,
    status = excluded.status,
    deleted_at = null,
    updated_at = timezone('utc', now());

  -- Demo competition memberships. The first competition includes mixed progress.
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
      v_owner_member_id,
      v_competition_id,
      v_owner_id,
      v_owner_display_name,
      v_owner_avatar_url,
      v_owner_friend_code,
      'owner',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '12 days'
    ),
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
      timezone('utc', now()) - interval '11 days'
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
      timezone('utc', now()) - interval '10 days'
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
      timezone('utc', now()) - interval '9 days'
    ),
    (
      v_noah_member_id,
      v_competition_id,
      v_noah_id,
      'Noah Lin',
      null,
      'NOAHLIN001',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '8 days'
    ),
    (
      v_second_owner_member_id,
      v_second_competition_id,
      v_owner_id,
      v_owner_display_name,
      v_owner_avatar_url,
      v_owner_friend_code,
      'owner',
      'accepted',
      v_owner_id,
      null
    ),
    (
      v_sofia_member_id,
      v_second_competition_id,
      v_sofia_id,
      'Sofia Hsu',
      'https://i.pravatar.cc/100?img=5',
      'SOFIAHSU01',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '4 days'
    ),
    (
      v_ethan_member_id,
      v_second_competition_id,
      v_ethan_id,
      'Ethan Tan',
      'https://i.pravatar.cc/100?img=15',
      'ETHANTAN01',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '3 days'
    ),
    (
      v_rina_member_id,
      v_second_competition_id,
      v_rina_id,
      'Rina Kim',
      'https://i.pravatar.cc/100?img=25',
      'RINAKIM001',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '2 days'
    ),
    (
      v_omar_member_id,
      v_second_competition_id,
      v_omar_id,
      'Omar Ali',
      null,
      'OMARALI001',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '1 day'
    ),
    (
      v_completed_owner_member_id,
      v_completed_competition_id,
      v_owner_id,
      v_owner_display_name,
      v_owner_avatar_url,
      v_owner_friend_code,
      'owner',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '45 days'
    ),
    (
      v_completed_luna_member_id,
      v_completed_competition_id,
      v_luna_id,
      'Luna Lee',
      'https://i.pravatar.cc/100?img=32',
      'LUNALEE001',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '44 days'
    ),
    (
      v_completed_kai_member_id,
      v_completed_competition_id,
      v_kai_id,
      'Kai Chen',
      'https://i.pravatar.cc/100?img=12',
      'KAICHEN001',
      'participant',
      'accepted',
      v_owner_id,
      timezone('utc', now()) - interval '43 days'
    ),
    (
      v_invited_sofia_member_id,
      v_invited_competition_id,
      v_sofia_id,
      'Sofia Hsu',
      'https://i.pravatar.cc/100?img=5',
      'SOFIAHSU01',
      'owner',
      'accepted',
      v_sofia_id,
      timezone('utc', now()) - interval '1 day'
    ),
    (
      v_invited_owner_member_id,
      v_invited_competition_id,
      v_owner_id,
      v_owner_display_name,
      v_owner_avatar_url,
      v_owner_friend_code,
      'participant',
      'invited',
      v_sofia_id,
      null
    ),
    (
      v_invited_ethan_member_id,
      v_invited_competition_id,
      v_ethan_id,
      'Ethan Tan',
      'https://i.pravatar.cc/100?img=15',
      'ETHANTAN01',
      'participant',
      'accepted',
      v_sofia_id,
      timezone('utc', now()) - interval '12 hours'
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

  -- Demo InBody records that make friend cards and leaderboards visibly different.
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
    (v_luna_start_record_id, v_luna_id, date '2026-04-01', 164, 27, 'female', 79, 59.4, 28.6, 11.1, 18.2, 5, 1330, 1850, true, 'manual', 'Demo baseline record for Luna', timezone('utc', now()), timezone('utc', now())),
    (v_luna_latest_record_id, v_luna_id, date '2026-06-01', 164, 27, 'female', 82, 58.7, 29.1, 10.6, 17.2, 5, 1345, 1860, true, 'manual', 'Demo latest record for Luna', timezone('utc', now()), timezone('utc', now())),
    (v_kai_start_record_id, v_kai_id, date '2026-04-20', 170, 29, 'male', 74, 72.0, 31.2, 14.0, 19.4, 8, 1580, 2300, true, 'manual', 'Demo baseline record for Kai', timezone('utc', now()), timezone('utc', now())),
    (v_kai_latest_record_id, v_kai_id, date '2026-06-06', 170, 29, 'male', 75, 70.0, 31.9, 13.1, 18.0, 7, 1575, 2290, true, 'manual', 'Demo latest record for Kai', timezone('utc', now()), timezone('utc', now())),
    (v_mia_start_record_id, v_mia_id, date '2026-04-15', 161, 30, 'female', 75, 66.0, 26.0, 18.4, 25.0, 7, 1360, 1880, true, 'manual', 'Demo baseline record for Mia', timezone('utc', now()), timezone('utc', now())),
    (v_mia_latest_record_id, v_mia_id, date '2026-06-05', 161, 30, 'female', 77, 64.8, 26.8, 17.1, 23.8, 7, 1372, 1890, true, 'manual', 'Demo latest record for Mia', timezone('utc', now()), timezone('utc', now())),
    (v_noah_start_record_id, v_noah_id, date '2026-04-10', 176, 32, 'male', 80, 82.0, 34.0, 16.0, 19.5, 7, 1680, 2450, true, 'manual', 'Demo baseline record for Noah', timezone('utc', now()), timezone('utc', now())),
    (v_noah_latest_record_id, v_noah_id, date '2026-06-07', 176, 32, 'male', 76, 84.5, 32.8, 18.9, 22.4, 9, 1695, 2470, true, 'manual', 'Demo latest record for Noah with regression', timezone('utc', now()), timezone('utc', now())),
    (v_sofia_start_record_id, v_sofia_id, date '2026-05-01', 158, 26, 'female', 72, 55.2, 24.8, 14.3, 25.9, 6, 1245, 1730, true, 'manual', 'Demo baseline record for Sofia', timezone('utc', now()), timezone('utc', now())),
    (v_sofia_latest_record_id, v_sofia_id, date '2026-06-09', 158, 26, 'female', 80, 54.1, 25.9, 12.6, 23.3, 5, 1280, 1760, true, 'manual', 'Demo latest record for Sofia with strong progress', timezone('utc', now()), timezone('utc', now())),
    (v_ethan_start_record_id, v_ethan_id, date '2026-05-10', 182, 34, 'male', 86, 78.5, 36.4, 10.8, 13.8, 4, 1795, 2630, true, 'manual', 'Demo baseline record for Ethan', timezone('utc', now()), timezone('utc', now())),
    (v_ethan_latest_record_id, v_ethan_id, date '2026-06-08', 182, 34, 'male', 88, 79.4, 37.2, 10.4, 13.1, 4, 1810, 2660, true, 'manual', 'Demo latest record for Ethan near target', timezone('utc', now()), timezone('utc', now())),
    (v_rina_only_record_id, v_rina_id, date '2026-03-28', 167, 31, 'female', 69, 62.0, 25.1, 19.0, 30.6, 8, 1320, 1810, false, 'manual', 'Demo old record for Rina, excluded from charts to test stale/non-chart data', timezone('utc', now()), timezone('utc', now())),
    (v_rina_latest_record_id, v_rina_id, date '2026-06-10', 167, 31, 'female', 71, 61.64, 25.4, 18.4, 29.8, 8, 1328, 1820, true, 'manual', 'Demo latest record for Rina with 18 percent competition progress', timezone('utc', now()), timezone('utc', now())),
    (v_omar_start_record_id, v_omar_id, date '2026-05-12', 174, 35, 'male', 78, 80.4, 33.2, 17.4, 21.6, 8, 1668, 2390, true, 'manual', 'Demo baseline record for Omar', timezone('utc', now()), timezone('utc', now())),
    (v_omar_latest_record_id, v_omar_id, date '2026-06-11', 174, 35, 'male', 75, 81.2, 32.7, 18.6, 22.9, 9, 1650, 2380, true, 'manual', 'Demo latest record for Omar with negative progress', timezone('utc', now()), timezone('utc', now()))
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

  -- Demo goals linked to competitions so leaderboards show achieved, positive, zero, and negative progress.
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
    ('11111111-1111-4111-8111-111111111111', v_luna_id, 'Summer recomposition', v_luna_start_record_id, v_competition_id, v_luna_member_id, 'weight', 59.4, 58.4, 'kg', date '2026-08-08', true, timezone('utc', now()), timezone('utc', now())),
    ('22222222-2222-4112-8112-222222222222', v_luna_id, 'Summer recomposition', v_luna_start_record_id, v_competition_id, v_luna_member_id, 'muscle', 28.6, 29.5, 'kg', date '2026-08-08', true, timezone('utc', now()), timezone('utc', now())),
    ('44444444-4444-4114-8114-444444444444', v_kai_id, 'Build strength', v_kai_start_record_id, v_competition_id, v_kai_member_id, 'weight', 72.0, 68.0, 'kg', date '2026-08-08', true, timezone('utc', now()), timezone('utc', now())),
    ('33333333-3333-4113-8113-333333333333', v_mia_id, 'Lean down', v_mia_start_record_id, v_competition_id, v_mia_member_id, 'fatPercent', 25.0, 22.0, '%', date '2026-08-08', true, timezone('utc', now()), timezone('utc', now())),
    ('55555555-5555-4115-8115-555555555555', v_noah_id, 'Reverse progress check', v_noah_start_record_id, v_competition_id, v_noah_member_id, 'fatPercent', 19.5, 18.5, '%', date '2026-08-08', true, timezone('utc', now()), timezone('utc', now())),
    ('66666666-6666-4116-8116-666666666666', v_sofia_id, 'Fat loss push', v_sofia_start_record_id, v_second_competition_id, v_sofia_member_id, 'fat', 14.3, 12.5, 'kg', date '2026-07-15', true, timezone('utc', now()), timezone('utc', now())),
    ('77777777-7777-4117-8117-777777777777', v_ethan_id, 'Score climb', v_ethan_start_record_id, v_second_competition_id, v_ethan_member_id, 'score', 86, 89, 'pts', date '2026-07-15', true, timezone('utc', now()), timezone('utc', now())),
    ('88888888-8888-4118-8118-888888888888', v_rina_id, 'Fresh start', v_rina_only_record_id, v_second_competition_id, v_rina_member_id, 'weight', 62.0, 60.0, 'kg', date '2026-07-15', true, timezone('utc', now()), timezone('utc', now())),
    ('99999999-9999-4119-8119-999999999999', v_omar_id, 'Reset the trend', v_omar_start_record_id, v_second_competition_id, v_omar_member_id, 'fatPercent', 21.6, 20.0, '%', date '2026-07-15', true, timezone('utc', now()), timezone('utc', now())),
    ('90909090-9090-4090-8090-909090909090', v_luna_id, 'May finish-line check', v_luna_start_record_id, v_completed_competition_id, v_completed_luna_member_id, 'weight', 59.4, 59.0, 'kg', date '2026-05-31', true, timezone('utc', now()) - interval '45 days', timezone('utc', now())),
    ('91919191-9191-4091-8091-919191919191', v_kai_id, 'May finish-line check', v_kai_start_record_id, v_completed_competition_id, v_completed_kai_member_id, 'muscle', 31.2, 31.8, 'kg', date '2026-05-31', true, timezone('utc', now()) - interval '45 days', timezone('utc', now())),
    ('92929292-9292-4092-8092-929292929292', v_sofia_id, 'Invite sprint', v_sofia_start_record_id, v_invited_competition_id, v_invited_sofia_member_id, 'fat', 14.3, 12.2, 'kg', date '2026-08-31', true, timezone('utc', now()) - interval '1 day', timezone('utc', now())),
    ('93939393-9393-4093-8093-939393939393', v_ethan_id, 'Invite sprint', v_ethan_start_record_id, v_invited_competition_id, v_invited_ethan_member_id, 'muscle', 36.4, 38.0, 'kg', date '2026-08-31', true, timezone('utc', now()) - interval '1 day', timezone('utc', now()))
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
