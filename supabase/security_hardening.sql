-- Baseline security hardening for the current Referrals Shopping schema.
-- Run LAST, after schema.sql and all feature migrations.
-- Server-side API operations should use SUPABASE_SERVICE_ROLE_KEY and verify
-- the caller's bearer token before changing protected records.

-- Profiles: users may read their own profile, but must not change role or wallet
-- balance through the browser client.
create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.role() = 'service_role' or current_user in ('postgres','supabase_admin') then
    return new;
  end if;
  if auth.uid() is null or auth.uid() <> old.id then
    raise exception 'Not allowed to update this profile';
  end if;
  if new.role is distinct from old.role then raise exception 'Role cannot be changed directly'; end if;
  if new.balance is distinct from old.balance then raise exception 'Wallet balance cannot be changed directly'; end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_sensitive_fields on public.profiles;
create trigger protect_profile_sensitive_fields
before update on public.profiles
for each row execute function public.protect_profile_sensitive_fields();

-- Campaign payment and moderation fields are server/admin controlled.
create or replace function public.protect_campaign_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.role() = 'service_role' or current_user in ('postgres','supabase_admin') or public.is_admin() then
    return new;
  end if;
  if auth.uid() is null or auth.uid() <> old.user_id then
    raise exception 'Not allowed to update this campaign';
  end if;
  if new.status is distinct from old.status
     or new.paid_amount is distinct from old.paid_amount
     or new.approved_at is distinct from old.approved_at
     or new.crypto_chain is distinct from old.crypto_chain then
    raise exception 'Campaign payment and approval fields are managed by the server';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_campaign_sensitive_fields on public.campaigns;
create trigger protect_campaign_sensitive_fields
before update on public.campaigns
for each row execute function public.protect_campaign_sensitive_fields();

-- Users can submit proof, but cannot self-approve/reject submissions.
create or replace function public.protect_submission_review_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.role() = 'service_role' or current_user in ('postgres','supabase_admin') or public.is_admin() then
    return new;
  end if;
  if auth.uid() is null or auth.uid() <> old.user_id then
    raise exception 'Not allowed to update this submission';
  end if;
  if new.status is distinct from old.status or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Submission review status is managed by an administrator';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_submission_review_fields on public.task_submissions;
create trigger protect_submission_review_fields
before update on public.task_submissions
for each row execute function public.protect_submission_review_fields();

-- Restrict payment order visibility and disallow browser-side mutation. The
-- server API owns creation and verification of payment orders.
alter table public.payment_orders enable row level security;
drop policy if exists pay_insert on public.payment_orders;
drop policy if exists pay_update on public.payment_orders;
drop policy if exists payment_orders_no_client_insert on public.payment_orders;
drop policy if exists payment_orders_no_client_update on public.payment_orders;
create policy payment_orders_no_client_insert on public.payment_orders
  for insert to authenticated with check (false);
create policy payment_orders_no_client_update on public.payment_orders
  for update to authenticated using (false) with check (false);

-- Remove direct client withdrawal creation if the old policy exists. Withdrawal
-- requests must be validated and inserted by the authenticated server API.
drop policy if exists wd_insert on public.withdrawals;
drop policy if exists withdrawals_no_client_insert on public.withdrawals;
create policy withdrawals_no_client_insert on public.withdrawals
  for insert to authenticated with check (false);

-- Explicit grants keep public/anonymous access off private ledgers.
revoke all on public.payment_orders from anon;
revoke all on public.bill_payments from anon;
