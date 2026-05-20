begin;

create table if not exists public.llm_daily_feature_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  request_date date not null,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint llm_daily_feature_usage_feature_key_check check (char_length(trim(feature_key)) > 0),
  constraint llm_daily_feature_usage_usage_count_check check (usage_count >= 0)
);

create unique index if not exists llm_daily_feature_usage_user_feature_date_idx_unique
  on public.llm_daily_feature_usage (user_id, feature_key, request_date);

create index if not exists llm_daily_feature_usage_user_feature_date_idx
  on public.llm_daily_feature_usage (user_id, feature_key, request_date desc, updated_at desc);

drop trigger if exists set_llm_daily_feature_usage_updated_at on public.llm_daily_feature_usage;
create trigger set_llm_daily_feature_usage_updated_at
before update on public.llm_daily_feature_usage
for each row
execute function public.set_updated_at();

alter table public.llm_daily_feature_usage enable row level security;

drop policy if exists "Users can view their own llm daily feature usage" on public.llm_daily_feature_usage;
create policy "Users can view their own llm daily feature usage"
on public.llm_daily_feature_usage
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own llm daily feature usage" on public.llm_daily_feature_usage;
create policy "Users can insert their own llm daily feature usage"
on public.llm_daily_feature_usage
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own llm daily feature usage" on public.llm_daily_feature_usage;
create policy "Users can update their own llm daily feature usage"
on public.llm_daily_feature_usage
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.plan_feature_entitlements (plan_code, feature_key, daily_limit, config)
values (
  'free',
  'inbody_scan',
  1,
  '{}'::jsonb
)
on conflict (plan_code, feature_key) do update
set daily_limit = excluded.daily_limit,
    config = excluded.config;

comment on table public.llm_daily_feature_usage is
'Per-user daily AI feature usage tracker for plan-driven limits such as AI scan. Uses feature_key + request_date.';

comment on column public.llm_daily_feature_usage.metadata is
'Optional JSON metadata for future auditing or per-request context.';

commit;
