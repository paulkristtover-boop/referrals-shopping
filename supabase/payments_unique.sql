-- Unique crypto amounts + 15 min payment window
-- Run in Supabase SQL Editor after features.sql

alter table public.payment_orders
  add column if not exists amount_crypto numeric(24, 12),
  add column if not exists unique_suffix int,
  add column if not exists deposit_address text,
  add column if not exists expires_at timestamptz,
  add column if not exists detected_tx text,
  add column if not exists rate_usd numeric(18, 8);

alter table public.campaigns
  add column if not exists amount_crypto numeric(24, 12),
  add column if not exists expires_at timestamptz;

-- Expire stale awaiting payments (callable by cron)
create or replace function public.expire_payment_orders()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.payment_orders
  set status = 'expired'
  where status = 'awaiting_payment'
    and expires_at is not null
    and expires_at < now();

  get diagnostics n = row_count;

  update public.campaigns c
  set status = 'expired'
  where c.status = 'pending_payment'
    and c.expires_at is not null
    and c.expires_at < now();

  return n;
end;
$$;
