-- Optional columns for Flutterwave / NGN checkout
alter table public.payment_orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists detected_tx text;

alter table public.campaigns
  add column if not exists payment_note text;

-- payment_orders was originally crypto-only; allow the Flutterwave NGN rail too.
alter table public.payment_orders drop constraint if exists payment_orders_crypto_chain_check;
alter table public.payment_orders
  add constraint payment_orders_crypto_chain_check
  check (crypto_chain in ('trx','sol','ton','ngn_flw'));
