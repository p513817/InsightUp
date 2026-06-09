begin;

alter table public.user_personal_goals
add column if not exists title text;

comment on column public.user_personal_goals.title is
'Optional user-facing title shared by items in a composite personal goal.';

commit;
