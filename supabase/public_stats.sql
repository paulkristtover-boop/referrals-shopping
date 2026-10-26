-- Public homepage stats (safe aggregates only)
-- Run in Supabase SQL Editor

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create or replace function public.get_public_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  online_n int;
begin
  select count(*)::int into online_n
  from public.profiles
  where last_seen_at is not null
    and last_seen_at > now() - interval '10 minutes'
    and coalesce(role, 'user') <> 'admin';

  select json_build_object(
    'users_total', (select count(*)::int from public.profiles where coalesce(role, 'user') <> 'admin'),
    'joined_today', (
      select count(*)::int from public.profiles
      where coalesce(role, 'user') <> 'admin'
        and created_at >= date_trunc('day', now())
    ),
    'campaigns_total', (select count(*)::int from public.campaigns),
    'campaigns_active', (select count(*)::int from public.campaigns where status = 'approved'),
    'submissions_total', (select count(*)::int from public.task_submissions),
    'submissions_today', (
      select count(*)::int from public.task_submissions
      where created_at >= date_trunc('day', now())
    ),
    'online_estimate', greatest(3, least(180, online_n + 5 + (
      select count(*)::int from public.profiles
      where created_at > now() - interval '24 hours'
        and coalesce(role, 'user') <> 'admin'
    ) / 2))
  ) into result;
  return result;
end;
$$;

grant execute on function public.get_public_stats() to anon, authenticated;

create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

grant execute on function public.touch_last_seen() to authenticated;

create or replace function public.get_live_activity()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  items json;
begin
  with events as (
    select
      'join'::text as kind,
      'joined RS'::text as text,
      (left(coalesce(split_part(coalesce(email, 'user'), '@', 1), 'user'), 3) || '***')::text as who,
      created_at as ts
    from public.profiles
    where coalesce(role, 'user') <> 'admin'
    order by created_at desc
    limit 6
  ),
  camps as (
    select
      'campaign'::text,
      case when status = 'approved' then 'started a promotion' else 'placed an order' end,
      'user***'::text,
      created_at
    from public.campaigns
    order by created_at desc
    limit 6
  ),
  earns as (
    select
      'earn'::text,
      'submitted a task'::text,
      'earn***'::text,
      created_at
    from public.task_submissions
    order by created_at desc
    limit 6
  ),
  all_e as (
    select * from events
    union all select * from camps
    union all select * from earns
  )
  select coalesce(
    json_agg(json_build_object('kind', kind, 'text', text, 'who', who, 'ts', ts) order by ts desc),
    '[]'::json
  )
  into items
  from (select * from all_e order by ts desc limit 12) s;

  return items;
end;
$$;

grant execute on function public.get_live_activity() to anon, authenticated;
