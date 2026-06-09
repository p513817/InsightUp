begin;

create table if not exists public.user_personal_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text not null,
  start_value numeric not null,
  target_value numeric not null,
  unit text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_personal_goals_metric_key_check check (
    metric_key in (
      'weight',
      'muscle',
      'fat',
      'fatPercent',
      'score',
      'visceralFatLevel',
      'bmr',
      'recommendedCalories'
    )
  )
);

create index if not exists user_personal_goals_user_created_idx
on public.user_personal_goals (user_id, created_at desc)
where deleted_at is null;

drop trigger if exists set_user_personal_goals_updated_at on public.user_personal_goals;
create trigger set_user_personal_goals_updated_at
before update on public.user_personal_goals
for each row
execute function public.set_updated_at();

alter table public.user_personal_goals enable row level security;

drop policy if exists "Users can view their own personal goals" on public.user_personal_goals;
create policy "Users can view their own personal goals"
on public.user_personal_goals
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own personal goals" on public.user_personal_goals;
create policy "Users can insert their own personal goals"
on public.user_personal_goals
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own personal goals" on public.user_personal_goals;
create policy "Users can update their own personal goals"
on public.user_personal_goals
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

comment on table public.user_personal_goals is
'User-owned personal body composition goals created from latest InBody values.';

commit;
