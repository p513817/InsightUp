begin;

create or replace function public.reserve_my_daily_feature_usage(
  input_feature text,
  input_request_date date,
  input_daily_limit integer default null
)
returns table (
  allowed boolean,
  usage_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_feature text := trim(coalesce(input_feature, ''));
  v_usage_count integer;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if char_length(v_feature) = 0 then
    raise exception 'feature key is required';
  end if;

  if input_request_date is null then
    raise exception 'request date is required';
  end if;

  if input_daily_limit = 0 then
    select coalesce(u.usage_count, 0)
    into v_usage_count
    from public.llm_daily_feature_usage u
    where u.user_id = v_user_id
      and u.feature_key = v_feature
      and u.request_date = input_request_date;

    return query select false, coalesce(v_usage_count, 0);
    return;
  end if;

  loop
    insert into public.llm_daily_feature_usage (
      user_id,
      feature_key,
      request_date,
      usage_count,
      last_used_at
    )
    values (
      v_user_id,
      v_feature,
      input_request_date,
      1,
      timezone('utc', now())
    )
    on conflict (user_id, feature_key, request_date) do nothing;

    if found then
      return query select true, 1;
      return;
    end if;

    if input_daily_limit is null then
      update public.llm_daily_feature_usage
      set usage_count = usage_count + 1,
          last_used_at = timezone('utc', now())
      where user_id = v_user_id
        and feature_key = v_feature
        and request_date = input_request_date
      returning llm_daily_feature_usage.usage_count into v_usage_count;

      if found then
        return query select true, v_usage_count;
        return;
      end if;

      continue;
    end if;

    update public.llm_daily_feature_usage
    set usage_count = usage_count + 1,
        last_used_at = timezone('utc', now())
    where user_id = v_user_id
      and feature_key = v_feature
      and request_date = input_request_date
      and usage_count < input_daily_limit
    returning llm_daily_feature_usage.usage_count into v_usage_count;

    if found then
      return query select true, v_usage_count;
      return;
    end if;

    select coalesce(u.usage_count, 0)
    into v_usage_count
    from public.llm_daily_feature_usage u
    where u.user_id = v_user_id
      and u.feature_key = v_feature
      and u.request_date = input_request_date;

    return query select false, coalesce(v_usage_count, 0);
    return;
  end loop;
end;
$$;

create or replace function public.release_my_daily_feature_usage(
  input_feature text,
  input_request_date date
)
returns table (
  usage_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_feature text := trim(coalesce(input_feature, ''));
  v_usage_count integer;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if char_length(v_feature) = 0 then
    raise exception 'feature key is required';
  end if;

  if input_request_date is null then
    raise exception 'request date is required';
  end if;

  update public.llm_daily_feature_usage
  set usage_count = greatest(usage_count - 1, 0),
      last_used_at = timezone('utc', now())
  where user_id = v_user_id
    and feature_key = v_feature
    and request_date = input_request_date
  returning llm_daily_feature_usage.usage_count into v_usage_count;

  return query select coalesce(v_usage_count, 0);
end;
$$;

comment on function public.reserve_my_daily_feature_usage(text, date, integer) is
'Atomically reserves one daily usage slot for the signed-in user and feature, enforcing the provided plan limit.';

comment on function public.release_my_daily_feature_usage(text, date) is
'Refunds one previously reserved daily usage slot for the signed-in user and feature on failed generation paths.';

commit;
