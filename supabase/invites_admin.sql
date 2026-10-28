-- Fix invite counts (RLS-safe) + unique UUID admin invites
-- Run in Supabase SQL Editor

-- Ensure invite columns
alter table public.profiles
  add column if not exists invite_code text,
  add column if not exists referred_by uuid references public.profiles(id);

create unique index if not exists profiles_invite_code_uidx
  on public.profiles (invite_code)
  where invite_code is not null;

-- UUID-style invite codes for users
create or replace function public.ensure_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_code is null or btrim(new.invite_code) = '' then
    new.invite_code := replace(gen_random_uuid()::text, '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_invite_code on public.profiles;
create trigger profiles_invite_code
  before insert on public.profiles
  for each row execute function public.ensure_invite_code();

-- Backfill missing invite codes
update public.profiles
set invite_code = replace(gen_random_uuid()::text, '-', '')
where invite_code is null or btrim(invite_code) = '';

-- Count people you invited (bypasses RLS safely)
create or replace function public.count_my_invites()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.profiles
  where referred_by = auth.uid();
$$;

grant execute on function public.count_my_invites() to authenticated;

-- List invitees (masked)
create or replace function public.list_my_invites()
returns table (
  id uuid,
  email_masked text,
  full_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    case
      when p.email is null then 'user***'
      else left(split_part(p.email, '@', 1), 3) || '***@' || split_part(p.email, '@', 2)
    end,
    p.full_name,
    p.created_at
  from public.profiles p
  where p.referred_by = auth.uid()
  order by p.created_at desc
  limit 100;
$$;

grant execute on function public.list_my_invites() to authenticated;

-- Lookup referrer by invite code (for register)
create or replace function public.resolve_invite_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.profiles
  where lower(invite_code) = lower(btrim(p_code))
  limit 1;
$$;

grant execute on function public.resolve_invite_code(text) to anon, authenticated;

-- ── Unique admin invite tokens (UUID, single-use) ──
create table if not exists public.admin_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  note text,
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_invite_tokens_unused_idx
  on public.admin_invite_tokens (token)
  where used_at is null;

alter table public.admin_invite_tokens enable row level security;

drop policy if exists "admin_tokens_select" on public.admin_invite_tokens;
drop policy if exists "admin_tokens_insert" on public.admin_invite_tokens;
create policy "admin_tokens_select" on public.admin_invite_tokens
  for select using (public.is_admin());
create policy "admin_tokens_insert" on public.admin_invite_tokens
  for insert with check (public.is_admin() and created_by = auth.uid());

-- Create a new unique admin UUID token
create or replace function public.create_admin_invite(p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tok uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create admin invites';
  end if;
  insert into public.admin_invite_tokens (created_by, note)
  values (auth.uid(), p_note)
  returning token into tok;
  return tok;
end;
$$;

grant execute on function public.create_admin_invite(text) to authenticated;

-- Promote user to admin using a one-time UUID token
create or replace function public.promote_admin_with_token(p_user_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can promote admins';
  end if;
  if p_user_id is null or p_token is null then
    raise exception 'User and token required';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and role = 'admin') then
    raise exception 'User is already an admin';
  end if;

  select id into tid
  from public.admin_invite_tokens
  where token = p_token and used_at is null
  for update;

  if tid is null then
    raise exception 'Invalid or already used admin invite UUID';
  end if;

  update public.profiles set role = 'admin' where id = p_user_id;

  update public.admin_invite_tokens
  set used_by = p_user_id, used_at = now()
  where id = tid;
end;
$$;

grant execute on function public.promote_admin_with_token(uuid, uuid) to authenticated;

-- Demote admin (no token required; cannot demote yourself)
create or replace function public.demote_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can demote';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot demote yourself';
  end if;
  update public.profiles set role = 'user' where id = p_user_id and role = 'admin';
end;
$$;

grant execute on function public.demote_admin(uuid) to authenticated;
