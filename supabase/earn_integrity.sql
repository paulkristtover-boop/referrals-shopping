-- Earn integrity: no self-tasks, wait timer, one proof per task
-- Run in Supabase SQL Editor

create table if not exists public.task_sessions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.task_sessions enable row level security;

drop policy if exists "task_sessions_select" on public.task_sessions;
create policy "task_sessions_select" on public.task_sessions
  for select using (auth.uid() = user_id or public.is_admin());

-- One submission per user per task
create unique index if not exists task_submissions_user_task_uidx
  on public.task_submissions (user_id, task_id);

-- Start timer session (open link)
create or replace function public.start_earn_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t record;
  camp_owner uuid;
  wait_sec int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select tk.*, c.user_id as owner_id, c.status as camp_status
  into t
  from public.tasks tk
  join public.campaigns c on c.id = tk.campaign_id
  where tk.id = p_task_id;

  if t is null then
    raise exception 'Task not found';
  end if;
  if t.active is not true then
    raise exception 'Task is not active';
  end if;
  if t.camp_status is distinct from 'approved' then
    raise exception 'Campaign not approved';
  end if;
  if t.owner_id = uid then
    raise exception 'You cannot earn from your own advert';
  end if;
  if exists (
    select 1 from public.task_submissions s
    where s.task_id = p_task_id and s.user_id = uid
  ) then
    raise exception 'Already submitted for this task';
  end if;

  insert into public.task_sessions (user_id, task_id, started_at)
  values (uid, p_task_id, now())
  on conflict (user_id, task_id) do nothing;

  select wait_seconds into wait_sec from public.tasks where id = p_task_id;

  return jsonb_build_object(
    'task_id', p_task_id,
    'wait_seconds', coalesce(wait_sec, 15),
    'started_at', (select started_at from public.task_sessions where user_id = uid and task_id = p_task_id)
  );
end;
$$;

grant execute on function public.start_earn_task(uuid) to authenticated;

-- Submit proof after wait
create or replace function public.submit_earn_task(p_task_id uuid, p_screenshot_url text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t record;
  sess timestamptz;
  sid uuid;
  wait_sec int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_screenshot_url is null or length(btrim(p_screenshot_url)) < 8 then
    raise exception 'Screenshot required';
  end if;

  select tk.*, c.user_id as owner_id, c.status as camp_status, tk.wait_seconds
  into t
  from public.tasks tk
  join public.campaigns c on c.id = tk.campaign_id
  where tk.id = p_task_id;

  if t is null or t.active is not true then
    raise exception 'Task not available';
  end if;
  if t.camp_status is distinct from 'approved' then
    raise exception 'Campaign not approved';
  end if;
  if t.owner_id = uid then
    raise exception 'You cannot earn from your own advert';
  end if;
  if exists (select 1 from public.task_submissions where task_id = p_task_id and user_id = uid) then
    raise exception 'Already submitted for this task';
  end if;

  select started_at into sess
  from public.task_sessions
  where user_id = uid and task_id = p_task_id;

  if sess is null then
    raise exception 'Open the link and start the timer first';
  end if;

  wait_sec := coalesce(t.wait_seconds, 15);
  if sess + (wait_sec || ' seconds')::interval > now() then
    raise exception 'Wait timer not finished yet';
  end if;

  insert into public.task_submissions (task_id, user_id, screenshot_url, status)
  values (p_task_id, uid, btrim(p_screenshot_url), 'pending')
  returning id into sid;

  return sid;
end;
$$;

grant execute on function public.submit_earn_task(uuid, text) to authenticated;
