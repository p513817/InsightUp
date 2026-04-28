-- InsightUp initial schema
-- Safe to run in Supabase SQL Editor for a fresh project.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'gender_type') then
    create type public.gender_type as enum ('male', 'female', 'other', 'unknown');
  end if;

  if not exists (select 1 from pg_type where typname = 'record_source_type') then
    create type public.record_source_type as enum ('manual', 'photo_scan');
  end if;

  if not exists (select 1 from pg_type where typname = 'scan_status_type') then
    create type public.scan_status_type as enum ('not_applicable', 'pending', 'processed', 'reviewed', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'segment_part_key') then
    create type public.segment_part_key as enum ('leftArm', 'rightArm', 'trunk', 'leftLeg', 'rightLeg');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.inbody_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at date not null,
  height numeric(5,2),
  age integer,
  gender public.gender_type not null default 'unknown',
  score integer,
  weight numeric(6,2),
  muscle numeric(6,2),
  fat numeric(6,2),
  fat_percent numeric(5,2),
  visceral_fat_level integer,
  bmr integer,
  recommended_calories integer,
  is_included_in_charts boolean not null default true,
  source_type public.record_source_type not null default 'manual',
  source_image_path text,
  scan_status public.scan_status_type not null default 'not_applicable',
  scan_confidence numeric(5,2),
  requires_review boolean not null default false,
  raw_extraction_json jsonb,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inbody_records_age_check check (age is null or age >= 0),
  constraint inbody_records_height_check check (height is null or height > 0),
  constraint inbody_records_score_check check (score is null or score between 0 and 100),
  constraint inbody_records_weight_check check (weight is null or weight >= 0),
  constraint inbody_records_muscle_check check (muscle is null or muscle >= 0),
  constraint inbody_records_fat_check check (fat is null or fat >= 0),
  constraint inbody_records_fat_percent_check check (fat_percent is null or fat_percent >= 0),
  constraint inbody_records_visceral_fat_level_check check (visceral_fat_level is null or visceral_fat_level >= 0),
  constraint inbody_records_bmr_check check (bmr is null or bmr >= 0),
  constraint inbody_records_recommended_calories_check check (recommended_calories is null or recommended_calories >= 0),
  constraint inbody_records_scan_confidence_check check (
    scan_confidence is null or (scan_confidence >= 0 and scan_confidence <= 100)
  ),
  constraint inbody_records_source_scan_check check (
    (source_type = 'manual' and scan_status = 'not_applicable')
    or source_type = 'photo_scan'
  )
);

create table if not exists public.inbody_segments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.inbody_records(id) on delete cascade,
  part_key public.segment_part_key not null,
  part_name text not null,
  muscle numeric(6,2),
  fat numeric(6,2),
  muscle_ratio numeric(6,2),
  fat_ratio numeric(6,2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inbody_segments_unique_part unique (record_id, part_key),
  constraint inbody_segments_muscle_check check (muscle is null or muscle >= 0),
  constraint inbody_segments_fat_check check (fat is null or fat >= 0),
  constraint inbody_segments_muscle_ratio_check check (muscle_ratio is null or muscle_ratio >= 0),
  constraint inbody_segments_fat_ratio_check check (fat_ratio is null or fat_ratio >= 0)
);

create index if not exists inbody_records_user_recorded_at_idx
  on public.inbody_records (user_id, recorded_at desc)
  where deleted_at is null;

create index if not exists inbody_records_user_chart_idx
  on public.inbody_records (user_id, is_included_in_charts, recorded_at desc)
  where deleted_at is null;

create index if not exists inbody_records_source_type_idx
  on public.inbody_records (source_type, scan_status);

create index if not exists inbody_segments_record_id_idx
  on public.inbody_segments (record_id);

drop trigger if exists set_inbody_records_updated_at on public.inbody_records;
create trigger set_inbody_records_updated_at
before update on public.inbody_records
for each row
execute function public.set_updated_at();

drop trigger if exists set_inbody_segments_updated_at on public.inbody_segments;
create trigger set_inbody_segments_updated_at
before update on public.inbody_segments
for each row
execute function public.set_updated_at();

create or replace view public.active_inbody_records
with (security_invoker = on) as
select *
from public.inbody_records
where deleted_at is null;

alter table public.inbody_records enable row level security;
alter table public.inbody_segments enable row level security;

drop policy if exists "Users can view their own records" on public.inbody_records;
create policy "Users can view their own records"
on public.inbody_records
for select
using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "Users can insert their own records" on public.inbody_records;
create policy "Users can insert their own records"
on public.inbody_records
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own records" on public.inbody_records;
create policy "Users can update their own records"
on public.inbody_records
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own records" on public.inbody_records;
create policy "Users can delete their own records"
on public.inbody_records
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view segments of their own records" on public.inbody_segments;
create policy "Users can view segments of their own records"
on public.inbody_segments
for select
using (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
      and r.deleted_at is null
  )
);

drop policy if exists "Users can insert segments of their own records" on public.inbody_segments;
create policy "Users can insert segments of their own records"
on public.inbody_segments
for insert
with check (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "Users can update segments of their own records" on public.inbody_segments;
create policy "Users can update segments of their own records"
on public.inbody_segments
for update
using (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete segments of their own records" on public.inbody_segments;
create policy "Users can delete segments of their own records"
on public.inbody_segments
for delete
using (
  exists (
    select 1
    from public.inbody_records r
    where r.id = inbody_segments.record_id
      and r.user_id = auth.uid()
  )
);

comment on table public.inbody_records is
'User-owned InBody records. Supports manual entry, photo scan, chart inclusion, and soft deletion.';

comment on column public.inbody_records.is_included_in_charts is
'When false, the record stays stored but should be excluded from chart analysis.';

comment on column public.inbody_records.deleted_at is
'Soft delete marker. Prefer this over hard delete when the product wants reversible removal.';

comment on table public.inbody_segments is
'Per-body-part composition values attached to an InBody record.';

commit;
