begin;

create or replace function public.delete_competition_with_members(
  input_competition_id uuid
)
returns table (
  competition_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_competition_owner_id uuid;
begin
  if v_owner_id is null then
    raise exception 'unauthorized';
  end if;

  select c.owner_id
  into v_competition_owner_id
  from public.competitions c
  where c.id = input_competition_id
    and c.deleted_at is null;

  if v_competition_owner_id is null then
    raise exception 'competition not found';
  end if;

  if v_competition_owner_id <> v_owner_id then
    raise exception 'competition not found';
  end if;

  update public.user_personal_goals
  set deleted_at = timezone('utc', now())
  where competition_id = input_competition_id
    and deleted_at is null;

  update public.competition_members
  set deleted_at = timezone('utc', now()),
      status = 'removed'
  where competition_id = input_competition_id
    and deleted_at is null;

  update public.competitions
  set deleted_at = timezone('utc', now()),
      status = 'cancelled'
  where id = input_competition_id
    and deleted_at is null;

  return query select input_competition_id;
end;
$$;

commit;
