-- Electricity / utility bill payment ledger.
-- Run after schema.sql and profiles are present. API calls use service role
-- only after verifying the user's Supabase access token.

create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null,
  biller_code text not null,
  item_code text not null,
  customer_reference text not null,
  customer_name text,
  payment_type text not null check (payment_type in ('prepaid','postpaid')),
  amount_ngn numeric(12,2) not null check (amount_ngn >= 500),
  reference text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','successful','failed','refunded','unknown')),
  provider_reference text,
  token text,
  provider_response jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists bill_payments_user_created_idx
  on public.bill_payments(user_id, created_at desc);
create index if not exists bill_payments_status_created_idx
  on public.bill_payments(status, created_at);

alter table public.bill_payments enable row level security;
drop policy if exists bill_payments_select_own on public.bill_payments;
create policy bill_payments_select_own on public.bill_payments
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
-- No client-side insert/update policies: all state changes go through the
-- authenticated server API using the service-role key.

create or replace function public.debit_wallet_for_bill(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_provider text,
  p_biller_code text,
  p_item_code text,
  p_customer_reference text,
  p_payment_type text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if p_amount < 500 then raise exception 'Minimum bill payment is NGN 500'; end if;
  if p_user_id is null or p_reference is null or length(trim(p_reference)) < 8 then
    raise exception 'Invalid bill payment reference';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Wallet profile not found'; end if;
  if (select balance from public.profiles where id = p_user_id) < p_amount then
    raise exception 'Insufficient wallet balance';
  end if;
  if exists (select 1 from public.bill_payments where reference = p_reference) then
    raise exception 'Duplicate bill payment reference';
  end if;
  update public.profiles set balance = balance - p_amount where id = p_user_id;
  insert into public.bill_payments(
    user_id, provider, biller_code, item_code, customer_reference,
    payment_type, amount_ngn, reference, status
  ) values (
    p_user_id, p_provider, p_biller_code, p_item_code, p_customer_reference,
    p_payment_type, p_amount, p_reference, 'processing'
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.refund_failed_bill(
  p_reference text,
  p_reason text default 'Provider confirmed payment failure'
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare r public.bill_payments%rowtype;
begin
  select * into r from public.bill_payments where reference = p_reference for update;
  if not found then return false; end if;
  if r.status in ('refunded','successful') then return false; end if;
  if r.status not in ('failed','pending','processing') then return false; end if;
  update public.profiles set balance = balance + r.amount_ngn where id = r.user_id;
  update public.bill_payments
    set status = 'refunded', failure_reason = p_reason, updated_at = now()
    where id = r.id;
  return true;
end;
$$;

revoke all on function public.debit_wallet_for_bill(uuid,numeric,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.refund_failed_bill(text,text) from public, anon, authenticated;
grant execute on function public.debit_wallet_for_bill(uuid,numeric,text,text,text,text,text,text) to service_role;
grant execute on function public.refund_failed_bill(text,text) to service_role;
