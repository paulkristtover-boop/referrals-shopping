-- Optional columns for Flutterwave / NGN checkout
alter table public.payment_orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists detected_tx text;

alter table public.campaigns
  add column if not exists payment_note text;
