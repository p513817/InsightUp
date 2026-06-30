begin;

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
  select auth.uid() is not null
    and input_user_id = auth.uid()
    and exists (
      select 1
      from public.competition_members cm
      where cm.competition_id = input_competition_id
        and cm.user_id = input_user_id
        and cm.deleted_at is null
        and cm.status = any (allowed_statuses)
    );
$$;

comment on function public.can_access_competition_membership(uuid, uuid, text[]) is
'Returns whether the signed-in user can access their own competition membership for the requested statuses.';

commit;
