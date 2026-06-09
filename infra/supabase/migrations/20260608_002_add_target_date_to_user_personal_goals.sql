begin;

alter table public.user_personal_goals
add column if not exists target_date date;

comment on column public.user_personal_goals.target_date is
'Optional target date for evaluating a personal goal.';

commit;
