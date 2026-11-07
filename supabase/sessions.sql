-- App-level session registry (device list + revoke)
create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_token_hash text,
  user_agent text,
  device_label text,
  ip text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  is_current boolean default false
);

create index if not exists app_sessions_user_idx on public.app_sessions (user_id, last_seen_at desc);

alter table public.app_sessions enable row level security;

drop policy if exists "sessions_select_own" on public.app_sessions;
create policy "sessions_select_own" on public.app_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.app_sessions;
create policy "sessions_insert_own" on public.app_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "sessions_update_own" on public.app_sessions;
create policy "sessions_update_own" on public.app_sessions
  for update using (auth.uid() = user_id);

-- Register / refresh current browser session
create or replace function public.touch_app_session(
  p_session_key text,
  p_user_agent text default null,
  p_device_label text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  key_hash text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  key_hash := md5(coalesce(p_session_key, 'unknown'));

  select id into sid from public.app_sessions
  where user_id = uid and session_token_hash = key_hash and revoked_at is null
  limit 1;

  if sid is null then
    -- clear is_current on others
    update public.app_sessions set is_current = false where user_id = uid and is_current = true;
    insert into public.app_sessions (user_id, session_token_hash, user_agent, device_label, is_current)
    values (uid, key_hash, nullif(p_user_agent, ''), nullif(p_device_label, ''), true)
    returning id into sid;
  else
    update public.app_sessions
    set last_seen_at = now(),
        is_current = true,
        user_agent = coalesce(nullif(p_user_agent, ''), user_agent),
        device_label = coalesce(nullif(p_device_label, ''), device_label)
    where id = sid;
    update public.app_sessions set is_current = false where user_id = uid and id <> sid and is_current = true;
  end if;

  return sid;
end;
$$;

grant execute on function public.touch_app_session(text, text, text) to authenticated;

-- Revoke one session (mark revoked; client must sign out if current)
create or replace function public.revoke_app_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.app_sessions
  set revoked_at = now(), is_current = false
  where id = p_session_id and user_id = auth.uid() and revoked_at is null;
end;
$$;

grant execute on function public.revoke_app_session(uuid) to authenticated;

create or replace function public.revoke_other_app_sessions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.app_sessions
  set revoked_at = now(), is_current = false
  where user_id = auth.uid() and is_current is not true and revoked_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.revoke_other_app_sessions() to authenticated;
