begin;

alter table public.llm_trend_daily_summaries
add column if not exists model_name text;

comment on column public.llm_trend_daily_summaries.model_name is
'Gemini model name used to generate the cached daily summary.';

commit;