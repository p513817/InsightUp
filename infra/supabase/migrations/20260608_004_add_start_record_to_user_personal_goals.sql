begin;

alter table public.user_personal_goals
add column if not exists start_record_id uuid references public.inbody_records(id) on delete set null;

create index if not exists user_personal_goals_start_record_idx
on public.user_personal_goals (start_record_id)
where deleted_at is null;

comment on column public.user_personal_goals.start_record_id is
'Optional InBody record used as the baseline for this personal goal item.';

commit;
