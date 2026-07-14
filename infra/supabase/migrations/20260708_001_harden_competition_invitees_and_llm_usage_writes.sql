begin;

drop policy if exists "Users can insert their own llm daily feature usage" on public.llm_daily_feature_usage;
drop policy if exists "Users can update their own llm daily feature usage" on public.llm_daily_feature_usage;

create or replace function public.create_competition_with_members(
  input_name text,
  input_target_date date,
  input_invitee_user_ids uuid[] default '{}'::uuid[],
  input_invitee_friend_codes text[] default '{}'::text[]
)
returns table (
  competition_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competition_id uuid;
  v_owner_id uuid := auth.uid();
  v_owner_profile record;
  v_invitee_id uuid;
  v_resolved_invitee_id uuid;
  v_invitee_code text;
  v_invitee_ids uuid[] := '{}'::uuid[];
  v_invitee_profile record;
begin
  if v_owner_id is null then
    raise exception 'unauthorized';
  end if;

  if input_name is null or length(trim(input_name)) = 0 then
    raise exception 'competition name is required';
  end if;

  if input_target_date is null then
    raise exception 'competition target date is required';
  end if;

  select p.display_name, p.avatar_url, p.friend_code
  into v_owner_profile
  from public.user_profiles p
  where p.user_id = v_owner_id;

  if v_owner_profile.display_name is null then
    raise exception 'owner profile not found';
  end if;

  insert into public.competitions (owner_id, name, target_date, status)
  values (v_owner_id, trim(input_name), input_target_date, 'active')
  returning id into v_competition_id;

  insert into public.competition_members (
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
  values (
    v_competition_id,
    v_owner_id,
    v_owner_profile.display_name,
    v_owner_profile.avatar_url,
    v_owner_profile.friend_code,
    'owner',
    'accepted',
    v_owner_id,
    timezone('utc', now())
  );

  for v_invitee_id in
    select distinct unnest(coalesce(input_invitee_user_ids, '{}'::uuid[]))
  loop
    if v_invitee_id is null or v_invitee_id = v_owner_id or v_invitee_id = any (v_invitee_ids) then
      continue;
    end if;

    if not exists (
      select 1
      from public.user_friendships f
      where f.user_id = v_owner_id
        and f.friend_user_id = v_invitee_id
    ) then
      raise exception 'invitee must already be your friend';
    end if;

    v_invitee_ids := array_append(v_invitee_ids, v_invitee_id);
  end loop;

  for v_invitee_code in
    select distinct upper(regexp_replace(trim(code), '\s+', '', 'g'))
    from unnest(coalesce(input_invitee_friend_codes, '{}'::text[])) as code
    where trim(code) <> ''
  loop
    select p.user_id
    into v_resolved_invitee_id
    from public.user_profiles p
    where p.friend_code = v_invitee_code;

    if v_resolved_invitee_id is null then
      raise exception 'invitee profile not found';
    end if;

    if v_resolved_invitee_id = v_owner_id or v_resolved_invitee_id = any (v_invitee_ids) then
      continue;
    end if;

    v_invitee_ids := array_append(v_invitee_ids, v_resolved_invitee_id);
  end loop;

  for v_invitee_id in
    select distinct unnest(v_invitee_ids)
  loop
    select p.display_name, p.avatar_url, p.friend_code
    into v_invitee_profile
    from public.user_profiles p
    where p.user_id = v_invitee_id;

    if v_invitee_profile.display_name is null then
      raise exception 'invitee profile not found';
    end if;

    insert into public.competition_members (
      competition_id,
      user_id,
      display_name,
      avatar_url,
      friend_code,
      role,
      status,
      invited_by_user_id
    )
    values (
      v_competition_id,
      v_invitee_id,
      v_invitee_profile.display_name,
      v_invitee_profile.avatar_url,
      v_invitee_profile.friend_code,
      'participant',
      'invited',
      v_owner_id
    );
  end loop;

  return query select v_competition_id;
end;
$$;

create or replace function public.update_competition_with_members(
  input_competition_id uuid,
  input_name text,
  input_target_date date,
  input_invitee_user_ids uuid[] default array[]::uuid[],
  input_invitee_friend_codes text[] default array[]::text[]
)
returns table (
  competition_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner_id uuid := auth.uid();
  v_competition record;
  v_invitee_id uuid;
  v_resolved_invitee_id uuid;
  v_invitee_code text;
  v_invitee_ids uuid[] := '{}'::uuid[];
  v_invitee_profile record;
begin
  if v_owner_id is null then
    raise exception 'not authenticated';
  end if;

  select c.id, c.owner_id
  into v_competition
  from public.competitions c
  where c.id = input_competition_id
    and c.deleted_at is null;

  if not found then
    raise exception 'competition not found';
  end if;

  if v_competition.owner_id <> v_owner_id then
    raise exception 'forbidden';
  end if;

  update public.competitions c
  set
    name = trim(input_name),
    target_date = input_target_date
  where c.id = input_competition_id;

  update public.user_personal_goals g
  set
    target_date = input_target_date,
    target_date_locked = true
  where g.competition_id = input_competition_id
    and g.deleted_at is null;

  for v_invitee_id in
    select distinct unnest(coalesce(input_invitee_user_ids, array[]::uuid[]))
  loop
    if v_invitee_id is null or v_invitee_id = v_owner_id or v_invitee_id = any (v_invitee_ids) then
      continue;
    end if;

    if not exists (
      select 1
      from public.user_friendships f
      where f.user_id = v_owner_id
        and f.friend_user_id = v_invitee_id
    ) then
      raise exception 'invitee must already be your friend';
    end if;

    v_invitee_ids := array_append(v_invitee_ids, v_invitee_id);
  end loop;

  for v_invitee_code in
    select distinct upper(regexp_replace(trim(code), '\s+', '', 'g'))
    from unnest(coalesce(input_invitee_friend_codes, array[]::text[])) as code
    where trim(code) <> ''
  loop
    select p.user_id
    into v_resolved_invitee_id
    from public.user_profiles p
    where p.friend_code = v_invitee_code;

    if v_resolved_invitee_id is null then
      raise exception 'invitee profile not found';
    end if;

    if v_resolved_invitee_id = v_owner_id or v_resolved_invitee_id = any (v_invitee_ids) then
      continue;
    end if;

    v_invitee_ids := array_append(v_invitee_ids, v_resolved_invitee_id);
  end loop;

  for v_invitee_id in
    select distinct unnest(v_invitee_ids)
  loop
    select p.display_name, p.avatar_url, p.friend_code
    into v_invitee_profile
    from public.user_profiles p
    where p.user_id = v_invitee_id;

    if not found then
      continue;
    end if;

    insert into public.competition_members (
      competition_id,
      user_id,
      display_name,
      avatar_url,
      friend_code,
      role,
      status,
      invited_by_user_id
    )
    select
      input_competition_id,
      v_invitee_id,
      v_invitee_profile.display_name,
      v_invitee_profile.avatar_url,
      v_invitee_profile.friend_code,
      'participant',
      'invited',
      v_owner_id
    where not exists (
      select 1
      from public.competition_members cm
      where cm.competition_id = input_competition_id
        and cm.user_id = v_invitee_id
        and cm.deleted_at is null
    );
  end loop;

  return query select input_competition_id;
end;
$$;

commit;
