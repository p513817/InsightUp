begin;

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_date date not null,
  status text not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint competitions_name_check check (char_length(trim(name)) > 0),
  constraint competitions_status_check check (status in ('active', 'completed', 'cancelled'))
);

create table if not exists public.competition_members (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  friend_code text,
  role text not null default 'participant',
  status text not null default 'invited',
  invited_by_user_id uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint competition_members_role_check check (role in ('owner', 'participant')),
  constraint competition_members_status_check check (status in ('invited', 'accepted', 'declined', 'removed'))
);

alter table public.user_personal_goals
add column if not exists competition_id uuid references public.competitions(id) on delete set null;

alter table public.user_personal_goals
add column if not exists competition_member_id uuid references public.competition_members(id) on delete set null;

alter table public.user_personal_goals
add column if not exists target_date_locked boolean not null default false;

create index if not exists competitions_owner_created_idx
on public.competitions (owner_id, created_at desc)
where deleted_at is null;

create index if not exists competition_members_competition_idx
on public.competition_members (competition_id, created_at desc)
where deleted_at is null;

create index if not exists competition_members_user_idx
on public.competition_members (user_id, created_at desc)
where deleted_at is null;

create unique index if not exists competition_members_competition_user_idx_unique
on public.competition_members (competition_id, user_id)
where deleted_at is null;

create index if not exists user_personal_goals_competition_idx
on public.user_personal_goals (competition_id, created_at desc)
where deleted_at is null and competition_id is not null;

create index if not exists user_personal_goals_competition_member_idx
on public.user_personal_goals (competition_member_id, created_at desc)
where deleted_at is null and competition_member_id is not null;

drop trigger if exists set_competitions_updated_at on public.competitions;
create trigger set_competitions_updated_at
before update on public.competitions
for each row
execute function public.set_updated_at();

drop trigger if exists set_competition_members_updated_at on public.competition_members;
create trigger set_competition_members_updated_at
before update on public.competition_members
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_personal_goals_updated_at on public.user_personal_goals;
create trigger set_user_personal_goals_updated_at
before update on public.user_personal_goals
for each row
execute function public.set_updated_at();

create or replace function public.normalize_competition_goal_target_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  competition_target_date date;
begin
  if new.competition_id is null then
    new.target_date_locked := coalesce(new.target_date_locked, false);
    return new;
  end if;

  select c.target_date
  into competition_target_date
  from public.competitions c
  where c.id = new.competition_id
    and c.deleted_at is null;

  if competition_target_date is null then
    raise exception 'competition not found';
  end if;

  new.target_date := competition_target_date;
  new.target_date_locked := true;
  return new;
end;
$$;

drop trigger if exists normalize_competition_goal_target_date on public.user_personal_goals;
create trigger normalize_competition_goal_target_date
before insert or update on public.user_personal_goals
for each row
execute function public.normalize_competition_goal_target_date();

create or replace function public.prevent_locked_competition_goal_date_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.target_date_locked and new.target_date is distinct from old.target_date then
    raise exception 'competition goal target date cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_locked_competition_goal_date_update on public.user_personal_goals;
create trigger prevent_locked_competition_goal_date_update
before update on public.user_personal_goals
for each row
execute function public.prevent_locked_competition_goal_date_update();

create or replace function public.create_competition_with_members(
  input_name text,
  input_target_date date,
  input_invitee_user_ids uuid[] default '{}'::uuid[]
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

  if coalesce(array_length(input_invitee_user_ids, 1), 0) > 0 then
    for v_invitee_id in
      select distinct unnest(coalesce(input_invitee_user_ids, '{}'::uuid[]))
    loop
      if v_invitee_id is null or v_invitee_id = v_owner_id then
        continue;
      end if;

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
  end if;

  return query select v_competition_id;
end;
$$;

create or replace function public.list_my_competitions_with_progress()
returns table (
  competition_id uuid,
  competition_name text,
  competition_target_date date,
  competition_status text,
  competition_owner_id uuid,
  competition_created_at timestamptz,
  competition_updated_at timestamptz,
  member_id uuid,
  member_user_id uuid,
  member_display_name text,
  member_avatar_url text,
  member_friend_code text,
  member_role text,
  member_status text,
  member_invited_by_user_id uuid,
  member_joined_at timestamptz,
  member_created_at timestamptz,
  member_updated_at timestamptz,
  member_latest_recorded_at date,
  member_goal_count integer,
  member_completed_goal_count integer,
  member_progress_percent integer,
  goal_id uuid,
  goal_title text,
  goal_metric_key text,
  goal_start_value numeric,
  goal_target_value numeric,
  goal_unit text,
  goal_target_date date,
  goal_target_date_locked boolean,
  goal_created_at timestamptz,
  goal_updated_at timestamptz,
  goal_latest_value numeric,
  goal_reference_record_date date,
  goal_progress_percent integer,
  goal_is_achieved boolean
)
language sql
stable
security definer
set search_path = public
as $$
with accessible_competitions as (
  select c.*
  from public.competitions c
  where c.deleted_at is null
    and auth.uid() is not null
    and exists (
      select 1
      from public.competition_members me
      where me.competition_id = c.id
        and me.user_id = auth.uid()
        and me.deleted_at is null
        and me.status in ('invited', 'accepted')
    )
)
select
  c.id as competition_id,
  c.name as competition_name,
  c.target_date as competition_target_date,
  c.status as competition_status,
  c.owner_id as competition_owner_id,
  c.created_at as competition_created_at,
  c.updated_at as competition_updated_at,
  cm.id as member_id,
  cm.user_id as member_user_id,
  cm.display_name as member_display_name,
  cm.avatar_url as member_avatar_url,
  cm.friend_code as member_friend_code,
  cm.role as member_role,
  cm.status as member_status,
  cm.invited_by_user_id as member_invited_by_user_id,
  cm.joined_at as member_joined_at,
  cm.created_at as member_created_at,
  cm.updated_at as member_updated_at,
  lr.recorded_at as member_latest_recorded_at,
  count(g.id) over (partition by cm.id) as member_goal_count,
  coalesce(sum(case when goal_is_achieved then 1 else 0 end) over (partition by cm.id), 0) as member_completed_goal_count,
  coalesce(round(avg(
    case
      when g.id is null then null
      when goal_latest_value is null then 0
      else goal_progress_value
    end
  ) over (partition by cm.id))::integer, 0) as member_progress_percent,
  g.id as goal_id,
  g.title as goal_title,
  g.metric_key as goal_metric_key,
  g.start_value as goal_start_value,
  g.target_value as goal_target_value,
  g.unit as goal_unit,
  g.target_date as goal_target_date,
  g.target_date_locked as goal_target_date_locked,
  g.created_at as goal_created_at,
  g.updated_at as goal_updated_at,
  goal_latest_value,
  lr.recorded_at as goal_reference_record_date,
  goal_progress_value as goal_progress_percent,
  goal_is_achieved
from accessible_competitions c
join public.competition_members cm
  on cm.competition_id = c.id
 and cm.deleted_at is null
left join lateral (
  select
    r.recorded_at,
    r.weight,
    r.muscle,
    r.fat,
    r.fat_percent,
    r.score,
    r.visceral_fat_level,
    r.bmr,
    r.recommended_calories
  from public.inbody_records r
  where r.user_id = cm.user_id
    and r.deleted_at is null
    and r.recorded_at <= c.target_date
  order by r.recorded_at desc, r.created_at desc
  limit 1
) lr on true
left join public.user_personal_goals g
  on g.competition_member_id = cm.id
 and g.deleted_at is null
left join lateral (
  select
    case g.metric_key
      when 'weight' then lr.weight
      when 'muscle' then lr.muscle
      when 'fat' then lr.fat
      when 'fatPercent' then lr.fat_percent
      when 'score' then lr.score::numeric
      when 'visceralFatLevel' then lr.visceral_fat_level::numeric
      when 'bmr' then lr.bmr::numeric
      when 'recommendedCalories' then lr.recommended_calories::numeric
      else null
    end as goal_latest_value,
    case
      when g.id is null then null
      when (
        g.target_value - g.start_value
      ) = 0 then
        case
          when (
            case g.metric_key
              when 'weight' then lr.weight
              when 'muscle' then lr.muscle
              when 'fat' then lr.fat
              when 'fatPercent' then lr.fat_percent
              when 'score' then lr.score::numeric
              when 'visceralFatLevel' then lr.visceral_fat_level::numeric
              when 'bmr' then lr.bmr::numeric
              when 'recommendedCalories' then lr.recommended_calories::numeric
              else null
            end
          ) = g.target_value then 100
          else 0
        end
      when (
        case g.metric_key
          when 'weight' then lr.weight
          when 'muscle' then lr.muscle
          when 'fat' then lr.fat
          when 'fatPercent' then lr.fat_percent
          when 'score' then lr.score::numeric
          when 'visceralFatLevel' then lr.visceral_fat_level::numeric
          when 'bmr' then lr.bmr::numeric
          when 'recommendedCalories' then lr.recommended_calories::numeric
          else null
        end
      ) is null then null
      else round((
        (
          case g.metric_key
            when 'weight' then lr.weight
            when 'muscle' then lr.muscle
            when 'fat' then lr.fat
            when 'fatPercent' then lr.fat_percent
            when 'score' then lr.score::numeric
            when 'visceralFatLevel' then lr.visceral_fat_level::numeric
            when 'bmr' then lr.bmr::numeric
            when 'recommendedCalories' then lr.recommended_calories::numeric
            else null
          end
        ) - g.start_value
      ) / nullif(g.target_value - g.start_value, 0) * 100)::integer
    end as goal_progress_value,
    case
      when g.id is null then false
      when (
        g.target_value - g.start_value
      ) = 0 then
        (
          case
            when (
              case g.metric_key
                when 'weight' then lr.weight
                when 'muscle' then lr.muscle
                when 'fat' then lr.fat
                when 'fatPercent' then lr.fat_percent
                when 'score' then lr.score::numeric
                when 'visceralFatLevel' then lr.visceral_fat_level::numeric
                when 'bmr' then lr.bmr::numeric
                when 'recommendedCalories' then lr.recommended_calories::numeric
                else null
              end
            ) = g.target_value then true
            else false
          end
        )
      when (g.target_value - g.start_value) > 0 then
        (
          case
            when (
              case g.metric_key
                when 'weight' then lr.weight
                when 'muscle' then lr.muscle
                when 'fat' then lr.fat
                when 'fatPercent' then lr.fat_percent
                when 'score' then lr.score::numeric
                when 'visceralFatLevel' then lr.visceral_fat_level::numeric
                when 'bmr' then lr.bmr::numeric
                when 'recommendedCalories' then lr.recommended_calories::numeric
                else null
              end
            ) >= g.target_value then true
            else false
          end
        )
      else
        (
          case
            when (
              case g.metric_key
                when 'weight' then lr.weight
                when 'muscle' then lr.muscle
                when 'fat' then lr.fat
                when 'fatPercent' then lr.fat_percent
                when 'score' then lr.score::numeric
                when 'visceralFatLevel' then lr.visceral_fat_level::numeric
                when 'bmr' then lr.bmr::numeric
                when 'recommendedCalories' then lr.recommended_calories::numeric
                else null
              end
            ) <= g.target_value then true
            else false
          end
        )
    end as goal_is_achieved
) goal_calc on true
order by c.created_at desc, member_progress_percent desc, cm.created_at asc, g.created_at asc nulls last;
$$;

alter table public.competitions enable row level security;
alter table public.competition_members enable row level security;

drop policy if exists "Users can view competitions they belong to" on public.competitions;
create policy "Users can view competitions they belong to"
on public.competitions
for select
using (
  deleted_at is null
  and auth.uid() is not null
  and exists (
    select 1
    from public.competition_members cm
    where cm.competition_id = competitions.id
      and cm.user_id = auth.uid()
      and cm.deleted_at is null
      and cm.status in ('invited', 'accepted')
  )
);

drop policy if exists "Users can create their own competitions" on public.competitions;
create policy "Users can create their own competitions"
on public.competitions
for insert
with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their competitions" on public.competitions;
create policy "Owners can update their competitions"
on public.competitions
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can view competition members for competitions they belong to" on public.competition_members;
create policy "Users can view competition members for competitions they belong to"
on public.competition_members
for select
using (
  deleted_at is null
  and auth.uid() is not null
  and exists (
    select 1
    from public.competitions c
    where c.id = competition_members.competition_id
      and c.deleted_at is null
      and exists (
        select 1
        from public.competition_members me
        where me.competition_id = c.id
          and me.user_id = auth.uid()
          and me.deleted_at is null
          and me.status in ('invited', 'accepted')
      )
  )
);

drop policy if exists "Owners can insert competition members" on public.competition_members;
create policy "Owners can insert competition members"
on public.competition_members
for insert
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.competitions c
    where c.id = competition_id
      and c.owner_id = auth.uid()
      and c.deleted_at is null
  )
);

drop policy if exists "Members can update their own competition membership" on public.competition_members;
create policy "Members can update their own competition membership"
on public.competition_members
for update
using (
  auth.uid() = user_id
  and deleted_at is null
)
with check (
  auth.uid() = user_id
  and deleted_at is null
);

comment on table public.competitions is
'Shared competition container with a fixed target date and owner-managed lifecycle.';

comment on table public.competition_members is
'Competition membership snapshot with stored display metadata for participants and invitees.';

comment on column public.user_personal_goals.competition_id is
'Optional competition reference. Competition-linked goals share a fixed target date and are visible to competition members.';

comment on column public.user_personal_goals.competition_member_id is
'Competition member row that owns this goal when the goal is competition-linked.';

comment on column public.user_personal_goals.target_date_locked is
'Prevents the target date from being changed after a competition-linked goal is created.';

commit;
