-- Display name: change at most every 14 days.
-- Admins can always change. name_verified = one-time unlock (cleared after the user saves).

alter table public.profiles
  add column if not exists name_changed_at timestamptz,
  add column if not exists name_verified boolean not null default false;

create or replace function public.update_display_name(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p record;
  next_name text := nullif(btrim(coalesce(p_name, '')), '');
  cooldown interval := interval '14 days';
  anchor timestamptz;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if next_name is null or length(next_name) < 2 then
    raise exception 'Name must be at least 2 characters';
  end if;
  if length(next_name) > 80 then
    raise exception 'Name is too long';
  end if;

  select * into p from public.profiles where id = uid for update;
  if p is null then
    raise exception 'Profile not found';
  end if;

  if p.full_name is not distinct from next_name then
    return;
  end if;

  perform set_config('rs.internal_profile_update','on',true);

  if coalesce(p.role, 'user') = 'admin' or coalesce(p.name_verified, false) then
    update public.profiles
      set full_name = next_name,
          name_changed_at = now(),
          name_verified = false
    where id = uid;
    return;
  end if;

  -- First time a name is set is always allowed
  if p.full_name is null or btrim(p.full_name) = '' then
    update public.profiles
      set full_name = next_name,
          name_changed_at = now()
    where id = uid;
    return;
  end if;

  anchor := coalesce(p.name_changed_at, p.created_at, now());
  if anchor + cooldown > now() then
    raise exception 'You can change your name again on %', to_char(anchor + cooldown, 'YYYY-MM-DD');
  end if;

  update public.profiles
    set full_name = next_name,
        name_changed_at = now()
  where id = uid;
end;
$$;

grant execute on function public.update_display_name(text) to authenticated;

create or replace function public.admin_verify_display_name(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  update public.profiles set name_verified = true where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

grant execute on function public.admin_verify_display_name(uuid) to authenticated;
