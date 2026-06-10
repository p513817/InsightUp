create or replace function public.update_competition_with_members(
  input_competition_id uuid,
  input_name text,
  input_target_date date,
  input_invitee_user_ids uuid[] default array[]::uuid[]
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
  v_invitee_profile record;
begin
  if v_owner_id is null then
    raise exception 'not authenticated';
  end if;

  select id, owner_id
  into v_competition
  from public.competitions
  where id = input_competition_id
    and deleted_at is null;

  if not found then
    raise exception 'competition not found';
  end if;

  if v_competition.owner_id <> v_owner_id then
    raise exception 'forbidden';
  end if;

  update public.competitions
  set
    name = trim(input_name),
    target_date = input_target_date
  where id = input_competition_id;

  update public.user_personal_goals
  set
    target_date = input_target_date,
    target_date_locked = true
  where competition_id = input_competition_id
    and deleted_at is null;

  foreach v_invitee_id in array coalesce(input_invitee_user_ids, array[]::uuid[]) loop
    if v_invitee_id is null or v_invitee_id = v_owner_id then
      continue;
    end if;

    select display_name, avatar_url, friend_code
    into v_invitee_profile
    from public.user_profiles
    where user_id = v_invitee_id;

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
