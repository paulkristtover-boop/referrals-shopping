-- IMPORTANT: apply after schema.sql and the feature migrations.
-- Prevent users from editing wallet/role/payment/review state through direct table updates.

create or replace function public.protect_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and coalesce(current_setting('rs.internal_profile_update', true), '') <> 'on' then
    new.id := old.id;
    new.email := old.email;
    new.full_name := old.full_name;
    new.created_at := old.created_at;
    new.role := old.role;
    new.balance := old.balance;
    new.account_id := old.account_id;
    new.invite_code := old.invite_code;
    new.referred_by := old.referred_by;
    new.totp_enabled := old.totp_enabled;
    new.free_starter_used_at := old.free_starter_used_at;
    new.name_changed_at := old.name_changed_at;
    new.name_verified := old.name_verified;
    new.last_seen_at := old.last_seen_at;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields before update on public.profiles
for each row execute function public.protect_profile_privileged_fields();

create or replace function public.protect_campaign_payment_state()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_package_price numeric;
begin
  if auth.uid() is not null and not public.is_admin() and coalesce(current_setting('rs.internal_campaign_update', true), '') <> 'on' then
    if old.user_id <> auth.uid() then raise exception 'Not your order'; end if;
    if old.status = 'draft' and new.status = 'pending_payment' then
      select price_usd into v_package_price from public.packages where id = new.package_id and active = true;
      if v_package_price is null or coalesce(new.paid_amount,0) < v_package_price then
        raise exception 'Order amount does not match the selected package';
      end if;
      new.user_id := old.user_id;
      new.status := 'pending_payment';
      new.approved_at := null;
      new.referrals_delivered := 0;
      new.completed_at := null;
    else
      if old.status not in ('draft','pending_payment') then raise exception 'This order can no longer be edited'; end if;
      new.user_id := old.user_id;
      new.package_id := old.package_id;
      new.status := old.status;
      new.paid_amount := old.paid_amount;
      new.crypto_chain := old.crypto_chain;
      new.payment_note := old.payment_note;
      new.approved_at := old.approved_at;
      new.referrals_delivered := old.referrals_delivered;
      new.completed_at := old.completed_at;
      new.tx_hash := old.tx_hash;
      new.tax_rate := old.tax_rate;
      new.tax_amount := old.tax_amount;
      new.net_amount := old.net_amount;
      new.invoice_number := old.invoice_number;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_campaign_payment_state on public.campaigns;
create trigger protect_campaign_payment_state before update on public.campaigns
for each row execute function public.protect_campaign_payment_state();

create or replace function public.protect_submission_review_state()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and coalesce(current_setting('rs.internal_submission_update', true), '') <> 'on' then
    if old.user_id <> auth.uid() then raise exception 'Not your submission'; end if;
    new.user_id := old.user_id;
    new.task_id := old.task_id;
    new.status := old.status;
    new.reviewed_at := old.reviewed_at;
    new.poster_reviewed_at := old.poster_reviewed_at;
    new.disputed_at := old.disputed_at;
    new.dispute_reason := old.dispute_reason;
    new.poster_note := old.poster_note;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_submission_review_state on public.task_submissions;
create trigger protect_submission_review_state before update on public.task_submissions
for each row execute function public.protect_submission_review_state();

create or replace function public.validate_campaign_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_price numeric;
begin
  if auth.uid() is not null and not public.is_admin() and coalesce(current_setting('rs.internal_campaign_update', true), '') <> 'on' then
    if new.user_id <> auth.uid() then raise exception 'Not your order'; end if;
    if new.status not in ('draft','pending_payment') then raise exception 'Invalid initial order status'; end if;
    if new.status = 'pending_payment' then
      select price_usd into v_price from public.packages where id = new.package_id and active = true;
      if v_price is null or coalesce(new.paid_amount,0) < v_price then raise exception 'Order amount does not match the selected package'; end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists validate_campaign_insert on public.campaigns;
create trigger validate_campaign_insert before insert on public.campaigns
for each row execute function public.validate_campaign_insert();

create or replace function public.can_submit_task(p_task_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tasks t join public.campaigns c on c.id = t.campaign_id
    where t.id = p_task_id and t.active = true and c.status = 'approved' and c.user_id <> auth.uid()
  );
$$;
grant execute on function public.can_submit_task(uuid) to authenticated;

-- Withdrawal requests must go through the balance-locking SECURITY DEFINER RPCs.
drop policy if exists "wd_insert" on public.withdrawals;
create policy "wd_insert" on public.withdrawals for insert to authenticated with check (false);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "campaigns_insert" on public.campaigns;
create policy "campaigns_insert" on public.campaigns for insert to authenticated
with check (auth.uid() = user_id and status in ('draft','pending_payment') and coalesce(paid_amount,0) >= 0);

drop policy if exists "campaigns_update" on public.campaigns;
create policy "campaigns_update" on public.campaigns for update to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "subs_update" on public.task_submissions;
create policy "subs_update" on public.task_submissions for update to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "subs_insert" on public.task_submissions;
create policy "subs_insert" on public.task_submissions for insert to authenticated
with check (auth.uid() = user_id and status = 'pending' and reviewed_at is null and public.can_submit_task(task_id));

-- Crypto payment orders must be created and mutated only by trusted server endpoints.
drop policy if exists "pay_insert" on public.payment_orders;
create policy "pay_insert" on public.payment_orders for insert to authenticated with check (false);
drop policy if exists "pay_update" on public.payment_orders;
create policy "pay_update" on public.payment_orders for update to authenticated
using (public.is_admin()) with check (public.is_admin());
