-- Wallet-funded Nigerian electricity payments.
-- Apply after the core schema. Wallet amounts are NGN.
create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null unique,
  provider_code text not null,
  meter_number text not null,
  meter_type text not null check (meter_type in ('prepaid','postpaid')),
  amount numeric(14,2) not null check (amount >= 500),
  status text not null default 'processing' check (status in ('processing','pending','paid','refunded','refund_review')),
  provider_reference text,
  provider_response jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bill_payments_user_created_idx on public.bill_payments(user_id, created_at desc);
alter table public.bill_payments enable row level security;
drop policy if exists "Users read own bill payments" on public.bill_payments;
create policy "Users read own bill payments" on public.bill_payments for select to authenticated using (auth.uid() = user_id);

create or replace function public.debit_wallet_for_bill(
  p_amount numeric, p_provider_code text, p_meter_number text, p_meter_type text, p_reference text
) returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid; v_balance numeric;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_amount < 500 or p_amount <> round(p_amount) then raise exception 'Minimum bill payment is ₦500'; end if;
  if p_meter_type not in ('prepaid','postpaid') then raise exception 'Invalid meter type'; end if;
  select balance into v_balance from public.profiles where id = auth.uid() for update;
  if v_balance is null then raise exception 'Wallet profile not found'; end if;
  if v_balance < p_amount then raise exception 'Insufficient wallet balance'; end if;
  perform set_config('rs.internal_profile_update','on',true);
  update public.profiles set balance = balance - p_amount where id = auth.uid();
  insert into public.bill_payments(user_id, reference, provider_code, meter_number, meter_type, amount)
    values(auth.uid(), p_reference, p_provider_code, p_meter_number, p_meter_type, p_amount) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.debit_wallet_for_bill(numeric,text,text,text,text) from public;
grant execute on function public.debit_wallet_for_bill(numeric,text,text,text,text) to authenticated;

-- Server-side only: called with the Supabase service-role key after provider failure.
create or replace function public.refund_failed_bill(p_bill_id uuid, p_reason text default 'Provider payment failed')
returns boolean language plpgsql security definer set search_path = public as $$
declare b public.bill_payments%rowtype;
begin
  select * into b from public.bill_payments where id = p_bill_id for update;
  if not found then return false; end if;
  if b.status = 'refunded' then return true; end if;
  if b.status = 'paid' then return false; end if;
  update public.profiles set balance = balance + b.amount where id = b.user_id;
  update public.bill_payments set status = 'refunded', failure_reason = left(p_reason,500), updated_at = now() where id = b.id;
  return true;
end; $$;
revoke all on function public.refund_failed_bill(uuid,text) from public, anon, authenticated;
grant execute on function public.refund_failed_bill(uuid,text) to service_role;
