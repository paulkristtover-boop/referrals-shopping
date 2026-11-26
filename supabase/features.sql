-- Extra features: invites, support, payments, admin isolation
-- Run after schema.sql and fix_rls.sql

alter table public.profiles
  add column if not exists invite_code text unique,
  add column if not exists referred_by uuid references public.profiles(id),
  add column if not exists totp_enabled boolean not null default false;

-- Generate invite codes for existing users
update public.profiles
set invite_code = upper(substr(md5(id::text || random()::text), 1, 8))
where invite_code is null;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','replied','closed')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  amount_usd numeric(10,2) not null,
  crypto_chain text not null check (crypto_chain in ('trx','sol','ton')),
  pay_code text not null unique,
  tx_hash text,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','submitted','confirmed','expired','rejected','cancelled')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

-- Unique payment reference on campaigns
alter table public.campaigns
  add column if not exists pay_code text,
  add column if not exists tx_hash text;

create or replace function public.gen_pay_code()
returns text language sql as $$
  select 'RS' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
$$;

create or replace function public.ensure_invite_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.invite_code is null then
    new.invite_code := upper(substr(md5(new.id::text || random()::text), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_invite_code on public.profiles;
create trigger profiles_invite_code
  before insert on public.profiles
  for each row execute function public.ensure_invite_code();

alter table public.support_tickets enable row level security;
alter table public.payment_orders enable row level security;

drop policy if exists "tickets_own" on public.support_tickets;
create policy "tickets_select" on public.support_tickets for select using (auth.uid() = user_id or public.is_admin());
create policy "tickets_insert" on public.support_tickets for insert with check (auth.uid() = user_id and not public.is_admin());
create policy "tickets_update" on public.support_tickets for update using (public.is_admin() or auth.uid() = user_id);

drop policy if exists "pay_own" on public.payment_orders;
create policy "pay_select" on public.payment_orders for select using (auth.uid() = user_id or public.is_admin());
create policy "pay_insert" on public.payment_orders for insert with check (auth.uid() = user_id);
create policy "pay_update" on public.payment_orders for update using (auth.uid() = user_id or public.is_admin());

-- Block admins from creating campaigns/tasks submissions (optional app-level; RLS soft block)
-- Users only for promote insert already checks user_id
