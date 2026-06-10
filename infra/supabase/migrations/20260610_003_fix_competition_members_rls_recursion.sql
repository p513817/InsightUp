create or replace function public.can_access_competition_membership(
  input_competition_id uuid,
  input_user_id uuid,
  allowed_statuses text[] default array['invited', 'accepted']::text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.competition_members cm
    where cm.competition_id = input_competition_id
      and cm.user_id = input_user_id
      and cm.deleted_at is null
      and cm.status = any (allowed_statuses)
  );
$$;

drop policy if exists "Users can view competitions they belong to" on public.competitions;
create policy "Users can view competitions they belong to"
on public.competitions
for select
using (
  deleted_at is null
  and auth.uid() is not null
  and public.can_access_competition_membership(competitions.id, auth.uid())
);

drop policy if exists "Users can view competition members for competitions they belong to" on public.competition_members;
create policy "Users can view competition members for competitions they belong to"
on public.competition_members
for select
using (
  deleted_at is null
  and auth.uid() is not null
  and public.can_access_competition_membership(competition_members.competition_id, auth.uid())
);
