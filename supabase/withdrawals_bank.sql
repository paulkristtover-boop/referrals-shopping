-- Bank withdrawals (Flutterwave) + Naira minimum
-- Run after withdrawals_safe.sql

alter table public.withdrawals
  add column if not exists method text default 'crypto',
  add column if not exists bank_code text,
  add column if not exists bank_name text,
  add column if not exists account_number text,
  add column if not exists account_name text,
  add column if not exists flw_transfer_id text,
  add column if not exists flw_reference text;

-- Min ₦1,000 for all withdrawals
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
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount < 1000 then
    raise exception 'Minimum withdrawal is ₦1,000';
  end if;
  if chain not in ('trx', 'sol', 'ton') then
    raise exception 'Invalid chain';
  end if;
  if p_wallet is null or length(btrim(p_wallet)) < 8 then
    raise exception 'Wallet address too short';
  end if;

  select balance into bal from public.profiles where id = uid for update;
  if bal is null then raise exception 'Profile not found'; end if;
  if bal < p_amount then raise exception 'Insufficient balance'; end if;

  perform set_config('rs.internal_profile_update','on',true);
  perform set_config('rs.internal_profile_update','on',true);
  update public.profiles set balance = balance - p_amount where id = uid;

  insert into public.withdrawals (user_id, amount, crypto_chain, wallet_address, status, method)
  values (uid, p_amount, chain, btrim(p_wallet), 'pending', 'crypto')
  returning id into wid;

  return wid;
end;
$$;

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

create or replace function public.request_bank_withdrawal(
  p_amount numeric,
  p_bank_code text,
  p_bank_name text,
  p_account_number text,
  p_account_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal numeric;
  wid uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount < 1000 then
    raise exception 'Minimum withdrawal is ₦1,000';
  end if;
  if p_bank_code is null or length(btrim(p_bank_code)) < 2 then
    raise exception 'Select a bank';
  end if;
  if p_account_number is null or length(regexp_replace(p_account_number, '\D', '', 'g')) < 10 then
    raise exception 'Enter a valid 10-digit account number';
  end if;
  if p_account_name is null or length(btrim(p_account_name)) < 2 then
    raise exception 'Enter account name';
  end if;

  select balance into bal from public.profiles where id = uid for update;
  if bal is null then raise exception 'Profile not found'; end if;
  if bal < p_amount then raise exception 'Insufficient balance'; end if;

  perform set_config('rs.internal_profile_update','on',true);
  update public.profiles set balance = balance - p_amount where id = uid;

  insert into public.withdrawals (
    user_id, amount, crypto_chain, wallet_address, status, method,
    bank_code, bank_name, account_number, account_name
  ) values (
    uid, p_amount, 'ngn_bank', regexp_replace(p_account_number, '\D', '', 'g'),
    'pending', 'bank',
    btrim(p_bank_code), nullif(btrim(p_bank_name), ''),
    regexp_replace(p_account_number, '\D', '', 'g'),
    btrim(p_account_name)
  ) returning id into wid;

  return wid;
end;
$$;

grant execute on function public.request_bank_withdrawal(numeric, text, text, text, text) to authenticated;
