-- Platform settings: deposit wallets editable by admin
create table if not exists public.platform_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.platform_settings enable row level security;

drop policy if exists "settings_admin_all" on public.platform_settings;
create policy "settings_admin_all" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Public read of deposit addresses only (via RPC)
create or replace function public.get_deposit_addresses()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'trx', coalesce((select value from public.platform_settings where key = 'deposit_trx'), ''),
    'sol', coalesce((select value from public.platform_settings where key = 'deposit_sol'), ''),
    'ton', coalesce((select value from public.platform_settings where key = 'deposit_ton'), '')
  );
$$;

grant execute on function public.get_deposit_addresses() to anon, authenticated;

create or replace function public.admin_set_setting(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_key not in ('deposit_trx', 'deposit_sol', 'deposit_ton') then
    raise exception 'Invalid setting key';
  end if;
  insert into public.platform_settings (key, value, updated_at, updated_by)
  values (p_key, coalesce(p_value, ''), now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

grant execute on function public.admin_set_setting(text, text) to authenticated;

-- Seed empty keys
insert into public.platform_settings (key, value) values
  ('deposit_trx', ''),
  ('deposit_sol', ''),
  ('deposit_ton', '')
on conflict (key) do nothing;
