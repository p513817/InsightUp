begin;

create or replace function public.personal_goal_matches_current_member(
  input_competition_id uuid,
  input_competition_member_id uuid,
  input_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and input_user_id = auth.uid()
    and exists (
      select 1
      from public.competition_members cm
      where cm.id = input_competition_member_id
        and cm.competition_id = input_competition_id
        and cm.user_id = input_user_id
        and cm.deleted_at is null
        and cm.status = 'accepted'
    );
$$;

create or replace function public.enforce_personal_goal_competition_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.competition_id is null) <> (new.competition_member_id is null) then
    raise exception 'competition goal linkage is incomplete';
  end if;

  if new.competition_id is null then
    return new;
  end if;

  if not public.personal_goal_matches_current_member(new.competition_id, new.competition_member_id, new.user_id) then
    raise exception 'competition goal membership mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_personal_goal_competition_membership on public.user_personal_goals;
create trigger enforce_personal_goal_competition_membership
before insert or update on public.user_personal_goals
for each row
execute function public.enforce_personal_goal_competition_membership();

drop policy if exists "Users can insert their own personal goals" on public.user_personal_goals;
create policy "Users can insert their own personal goals"
on public.user_personal_goals
for insert
with check (
  auth.uid() = user_id
  and (
    (
      competition_id is null
      and competition_member_id is null
    )
    or public.personal_goal_matches_current_member(competition_id, competition_member_id, user_id)
  )
);

drop policy if exists "Users can update their own personal goals" on public.user_personal_goals;
create policy "Users can update their own personal goals"
on public.user_personal_goals
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    (
      competition_id is null
      and competition_member_id is null
    )
    or public.personal_goal_matches_current_member(competition_id, competition_member_id, user_id)
  )
);

comment on function public.personal_goal_matches_current_member(uuid, uuid, uuid) is
'Returns whether a competition-linked personal goal belongs to the signed-in user and their accepted competition membership row.';

comment on function public.enforce_personal_goal_competition_membership() is
'Rejects personal goals whose competition linkage does not belong to the same signed-in user and accepted competition membership.';

commit;
