-- 1) Fix payment_orders status check (cancel + Flutterwave compatible)
-- Error was: violates check constraint "payment_orders_status_check"

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.payment_orders'::regclass
      and contype = 'c'
      and (
        conname ilike '%status%'
        or pg_get_constraintdef(oid) ilike '%awaiting_payment%'
        or pg_get_constraintdef(oid) ilike '%status%'
      )
  loop
    execute format('alter table public.payment_orders drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.payment_orders
  drop constraint if exists payment_orders_status_check;

alter table public.payment_orders
  add constraint payment_orders_status_check
  check (
    status in (
      'awaiting_payment',
      'submitted',
      'confirmed',
      'expired',
      'rejected',
      'cancelled'
    )
  );

-- 2) FULL DATA WIPE — marketplace tables only (keeps auth.users)
-- WARNING: irreversible. Packages can be re-seeded with plans_recalibrated.sql

truncate table
  public.task_submissions,
  public.tasks,
  public.payment_orders,
  public.campaigns,
  public.withdrawals,
  public.support_tickets,
  public.audit_logs
cascade;

-- Optional: notifications, sessions, bet codes, invites if present
do $$
begin
  if to_regclass('public.notifications') is not null then
    execute 'truncate table public.notifications cascade';
  end if;
  if to_regclass('public.app_sessions') is not null then
    execute 'truncate table public.app_sessions cascade';
  end if;
  if to_regclass('public.bet_codes') is not null then
    execute 'truncate table public.bet_codes cascade';
  end if;
  if to_regclass('public.admin_invites') is not null then
    execute 'truncate table public.admin_invites cascade';
  end if;
  if to_regclass('public.platform_settings') is not null then
    -- keep settings rows; clear nothing required
    null;
  end if;
end $$;

-- Reset profile balances / free trial flags (keep accounts + roles)
update public.profiles
set
  balance = 0,
  free_starter_used_at = null
where true;

-- Optional hard reset of packages then re-seed via plans_recalibrated.sql
-- truncate table public.packages cascade;

comment on constraint payment_orders_status_check on public.payment_orders is
  'awaiting_payment|submitted|confirmed|expired|rejected|cancelled';
