begin;

create table if not exists public.user_dashboard_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  metric_order text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_dashboard_preferences_metric_order_limit check (
    coalesce(array_length(metric_order, 1), 0) <= 24
  )
);

drop trigger if exists set_user_dashboard_preferences_updated_at on public.user_dashboard_preferences;
create trigger set_user_dashboard_preferences_updated_at
before update on public.user_dashboard_preferences
for each row
execute function public.set_updated_at();

alter table public.user_dashboard_preferences enable row level security;

drop policy if exists "Users can view their own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can view their own dashboard preferences"
on public.user_dashboard_preferences
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can insert their own dashboard preferences"
on public.user_dashboard_preferences
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can update their own dashboard preferences"
on public.user_dashboard_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

comment on table public.user_dashboard_preferences is
'User-owned dashboard UI preferences such as metric card order.';

commit;