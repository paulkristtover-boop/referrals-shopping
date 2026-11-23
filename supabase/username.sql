-- Public @username handles (unique, separate from display name)
-- Run after name_lock.sql / profiles exist.

alter table public.profiles
  add column if not exists username text,
  add column if not exists username_changed_at timestamptz;

-- Normalize to lowercase; uniqueness case-insensitive
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.username is 'Public handle without @; lowercase a-z 0-9 underscore';

create or replace function public.normalize_username(p text)
returns text
language sql
immutable
as $$
  select nullif(lower(btrim(coalesce(p, ''))), '');
$$;

create or replace function public.update_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p record;
  next_u text := public.normalize_username(p_username);
  cooldown interval := interval '30 days';
  anchor timestamptz;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  if next_u is null then
    raise exception 'Username is required';
  end if;
  if length(next_u) < 3 then
    raise exception 'Username must be at least 3 characters';
  end if;
  if length(next_u) > 24 then
    raise exception 'Username must be at most 24 characters';
  end if;
  if next_u !~ '^[a-z0-9_]+$' then
    raise exception 'Username: only letters, numbers, and underscore';
  end if;
  if next_u ~ '^[0-9]+$' then
    raise exception 'Username cannot be only numbers';
  end if;
  -- reserved
  if next_u in ('admin','support','system','help','root','null','api','www','official','referrals','shopping') then
    raise exception 'That username is reserved';
  end if;

  select * into p from public.profiles where id = uid for update;
  if p is null then
    raise exception 'Profile not found';
  end if;

  if p.username is not distinct from next_u then
    return;
  end if;

  -- taken by someone else?
  if exists (
    select 1 from public.profiles
    where lower(username) = next_u and id <> uid
  ) then
    raise exception 'Username is already taken';
  end if;

  -- first set always allowed; admins always; else 30-day cooldown
  if p.username is null or btrim(p.username) = '' or coalesce(p.role, 'user') = 'admin' then
    update public.profiles
      set username = next_u, username_changed_at = now()
    where id = uid;
    return;
  end if;

  anchor := coalesce(p.username_changed_at, p.created_at, now());
  if anchor + cooldown > now() then
    raise exception 'You can change your username again on %', to_char(anchor + cooldown, 'YYYY-MM-DD');
  end if;

  update public.profiles
    set username = next_u, username_changed_at = now()
  where id = uid;
end;
$$;

grant execute on function public.update_username(text) to authenticated;
grant execute on function public.normalize_username(text) to authenticated;
