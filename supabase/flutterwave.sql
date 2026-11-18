-- Flutterwave NGN checkout support. Run after features.sql / payment_orders exist.
alter table public.payment_orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists detected_tx text,
  add column if not exists payment_provider text,
  add column if not exists currency text not null default 'NGN';

alter table public.campaigns
  add column if not exists payment_note text;

-- Allow Flutterwave orders alongside the existing crypto order type when the
-- installation has a provider/type constraint. Drop only known legacy checks.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.payment_orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%crypto%'
      and pg_get_constraintdef(oid) ilike '%chain%'
  loop
    execute format('alter table public.payment_orders drop constraint %I', c.conname);
  end loop;
end $$;

create index if not exists payment_orders_provider_status_idx
  on public.payment_orders (payment_provider, status);
