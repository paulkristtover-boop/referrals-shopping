-- Human-friendly Account ID (RS-#####). UUID stays internal as profiles.id.
-- Run in Supabase SQL Editor.

create sequence if not exists public.account_id_seq start 10001;

alter table public.profiles
  add column if not exists account_id text;

-- Unique when present
create unique index if not exists profiles_account_id_uidx
  on public.profiles (account_id)
  where account_id is not null;

-- Assign RS-10001 style ids
create or replace function public.assign_account_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_id is null or btrim(new.account_id) = '' then
    new.account_id := 'RS-' || nextval('public.account_id_seq')::text;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_account_id on public.profiles;
create trigger profiles_account_id
  before insert on public.profiles
  for each row execute function public.assign_account_id();

-- Backfill existing rows
update public.profiles
set account_id = 'RS-' || nextval('public.account_id_seq')::text
where account_id is null or btrim(account_id) = '';

-- Resolve public account id → internal uuid (admin / support)
create or replace function public.resolve_account_id(p_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.profiles
  where upper(account_id) = upper(btrim(p_code))
  limit 1;
$$;

grant execute on function public.resolve_account_id(text) to authenticated;
