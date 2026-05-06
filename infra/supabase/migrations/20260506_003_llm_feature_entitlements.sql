begin;

create table if not exists public.subscription_plans (
  code text primary key,
  display_name text not null,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plan_feature_entitlements (
  plan_code text not null references public.subscription_plans(code) on delete cascade,
  feature_key text not null,
  daily_limit integer,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (plan_code, feature_key),
  constraint plan_feature_entitlements_daily_limit_check check (daily_limit is null or daily_limit >= 0),
  constraint plan_feature_entitlements_feature_key_check check (char_length(trim(feature_key)) > 0)
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  status text not null,
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  provider text,
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_subscriptions_status_check check (status in ('trialing', 'active', 'cancelled', 'expired')),
  constraint user_subscriptions_period_check check (ends_at is null or ends_at >= starts_at)
);

create index if not exists user_subscriptions_user_active_idx
  on public.user_subscriptions (user_id, status, starts_at desc);

drop trigger if exists set_subscription_plans_updated_at on public.subscription_plans;
create trigger set_subscription_plans_updated_at
before update on public.subscription_plans
for each row
execute function public.set_updated_at();

drop trigger if exists set_plan_feature_entitlements_updated_at on public.plan_feature_entitlements;
create trigger set_plan_feature_entitlements_updated_at
before update on public.plan_feature_entitlements
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_subscriptions_updated_at on public.user_subscriptions;
create trigger set_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_updated_at();

insert into public.subscription_plans (code, display_name, is_default)
values ('free', 'Free', true)
on conflict (code) do update
set display_name = excluded.display_name,
    is_default = excluded.is_default;

insert into public.plan_feature_entitlements (plan_code, feature_key, daily_limit, config)
values (
  'free',
  'trend_summary',
  1,
  '{"model_pool":["gemini-2.5-flash-lite","gemini-2.5-flash","gemini-2.5-pro","gemini-3.1-flash-lite-preview","gemini-3-flash-preview"],"allow_rotation":true}'::jsonb
)
on conflict (plan_code, feature_key) do update
set daily_limit = excluded.daily_limit,
    config = excluded.config;

alter table public.llm_trend_daily_summaries
add column if not exists feature_key text not null default 'trend_summary';

alter table public.llm_trend_daily_summaries
add column if not exists usage_count integer not null default 0;

alter table public.llm_trend_daily_summaries
add column if not exists last_generated_at timestamptz;

alter table public.llm_trend_daily_summaries
drop constraint if exists llm_trend_daily_summaries_once_per_day;

drop index if exists llm_trend_daily_summaries_user_date_idx;

update public.llm_trend_daily_summaries
set usage_count = 1,
    last_generated_at = coalesce(last_generated_at, updated_at, created_at)
where usage_count = 0;

create unique index if not exists llm_trend_daily_summaries_user_feature_date_idx_unique
  on public.llm_trend_daily_summaries (user_id, feature_key, request_date);

create index if not exists llm_trend_daily_summaries_user_feature_date_idx
  on public.llm_trend_daily_summaries (user_id, feature_key, request_date desc, updated_at desc);

create or replace function public.resolve_my_feature_entitlement(input_feature text)
returns table (
  plan_code text,
  daily_limit integer,
  config jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with active_subscription as (
    select us.plan_code
    from public.user_subscriptions us
    join public.subscription_plans p on p.code = us.plan_code
    where us.user_id = auth.uid()
      and p.is_active = true
      and us.status in ('trialing', 'active')
      and us.starts_at <= timezone('utc', now())
      and (us.ends_at is null or us.ends_at >= timezone('utc', now()))
    order by case us.status when 'active' then 0 when 'trialing' then 1 else 2 end,
      us.starts_at desc,
      us.created_at desc
    limit 1
  ),
  fallback_plan as (
    select p.code as plan_code
    from public.subscription_plans p
    where p.is_default = true
      and p.is_active = true
    limit 1
  ),
  resolved_plan as (
    select plan_code from active_subscription
    union all
    select plan_code from fallback_plan
    where not exists (select 1 from active_subscription)
    limit 1
  )
  select rp.plan_code,
    pfe.daily_limit,
    pfe.config
  from resolved_plan rp
  left join public.plan_feature_entitlements pfe
    on pfe.plan_code = rp.plan_code
   and pfe.feature_key = trim(coalesce(input_feature, ''))
  limit 1;
$$;

alter table public.subscription_plans enable row level security;
alter table public.plan_feature_entitlements enable row level security;
alter table public.user_subscriptions enable row level security;

drop policy if exists "Authenticated users can view active subscription plans" on public.subscription_plans;
create policy "Authenticated users can view active subscription plans"
on public.subscription_plans
for select
using (auth.role() = 'authenticated' and is_active = true);

drop policy if exists "Authenticated users can view active plan entitlements" on public.plan_feature_entitlements;
create policy "Authenticated users can view active plan entitlements"
on public.plan_feature_entitlements
for select
using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.subscription_plans p
    where p.code = plan_feature_entitlements.plan_code
      and p.is_active = true
  )
);

drop policy if exists "Users can view their own subscriptions" on public.user_subscriptions;
create policy "Users can view their own subscriptions"
on public.user_subscriptions
for select
using (auth.uid() = user_id);

comment on table public.subscription_plans is
'Plan catalog for free and paid InsightUp tiers.';

comment on table public.plan_feature_entitlements is
'Per-plan feature entitlements such as daily LLM usage limits and model configuration.';

comment on table public.user_subscriptions is
'User plan assignments with lifecycle windows for paid and trial access.';

comment on column public.plan_feature_entitlements.config is
'JSON configuration bag for future feature-specific settings like model pools or rotation rules.';

comment on table public.llm_trend_daily_summaries is
'Latest generated LLM summary per user, feature, and day, including usage_count for regenerate limits.';

commit;