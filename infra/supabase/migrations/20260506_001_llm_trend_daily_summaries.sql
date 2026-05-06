begin;

create table if not exists public.llm_trend_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_date date not null,
  summary_text text not null,
  source_record_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint llm_trend_daily_summaries_once_per_day unique (user_id, request_date),
  constraint llm_trend_daily_summaries_source_record_count_check check (source_record_count >= 0)
);

create index if not exists llm_trend_daily_summaries_user_date_idx
  on public.llm_trend_daily_summaries (user_id, request_date desc);

drop trigger if exists set_llm_trend_daily_summaries_updated_at on public.llm_trend_daily_summaries;
create trigger set_llm_trend_daily_summaries_updated_at
before update on public.llm_trend_daily_summaries
for each row
execute function public.set_updated_at();

alter table public.llm_trend_daily_summaries enable row level security;

drop policy if exists "Users can view their own llm summaries" on public.llm_trend_daily_summaries;
create policy "Users can view their own llm summaries"
on public.llm_trend_daily_summaries
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own llm summaries" on public.llm_trend_daily_summaries;
create policy "Users can insert their own llm summaries"
on public.llm_trend_daily_summaries
for insert
with check (auth.uid() = user_id);

comment on table public.llm_trend_daily_summaries is
'One Gemini trend summary per user per day to cap LLM usage and cache daily insight output.';

commit;
