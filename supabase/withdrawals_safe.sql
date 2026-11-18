-- Safe withdrawals: deduct on request, refund on reject
-- Run after schema.sql

alter table public.withdrawals
  add column if not exists processed_at timestamptz,
  add column if not exists admin_note text;

-- Min $1 to allow small tests; change to 5 in production if you want
create or replace function public.request_withdrawal(
  p_amount numeric,
  p_chain text,
  p_wallet text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal numeric;
  wid uuid;
  chain text := lower(btrim(p_chain));
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'Minimum withdrawal is $1.00';
  end if;
  if chain not in ('trx', 'sol', 'ton') then
    raise exception 'Invalid chain';
  end if;
  if p_wallet is null or length(btrim(p_wallet)) < 8 then
    raise exception 'Wallet address too short';
  end if;

  -- Lock profile row
  select balance into bal from public.profiles where id = uid for update;
  if bal is null then
    raise exception 'Profile not found';
  end if;
  if bal < p_amount then
    raise exception 'Insufficient balance';
  end if;

  perform set_config('rs.internal_profile_update','on',true);
  update public.profiles set balance = balance - p_amount where id = uid;

  insert into public.withdrawals (user_id, amount, crypto_chain, wallet_address, status)
  values (uid, p_amount, chain, btrim(p_wallet), 'pending')
  returning id into wid;

  return wid;
end;
$$;

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

create or replace function public.admin_mark_withdrawal_paid(p_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  update public.withdrawals
  set status = 'paid', processed_at = now(), admin_note = p_note
  where id = p_id and status = 'pending';
  if not found then
    raise exception 'Withdrawal not found or not pending';
  end if;
end;
$$;

grant execute on function public.admin_mark_withdrawal_paid(uuid, text) to authenticated;

create or replace function public.admin_reject_withdrawal(p_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  select * into w from public.withdrawals where id = p_id for update;
  if w is null then
    raise exception 'Withdrawal not found';
  end if;
  if w.status <> 'pending' then
    raise exception 'Only pending withdrawals can be rejected';
  end if;

  update public.withdrawals
  set status = 'rejected', processed_at = now(), admin_note = p_note
  where id = p_id;

  -- Refund
  update public.profiles
  set balance = balance + w.amount
  where id = w.user_id;
end;
$$;

grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated;
