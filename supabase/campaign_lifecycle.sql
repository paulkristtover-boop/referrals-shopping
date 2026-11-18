-- Campaign order lifecycle for promoters
-- Statuses: pending_payment → pending_approval → approved → completed
-- Also: rejected, expired

alter table public.campaigns
  add column if not exists referrals_delivered int not null default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists approved_at timestamptz;

-- Mark delivery progress; auto-complete when goal reached
create or replace function public.admin_set_delivery(p_campaign_id uuid, p_delivered int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  goal int;
  st text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_delivered is null or p_delivered < 0 then
    raise exception 'Invalid delivered count';
  end if;

  select c.status, coalesce(pk.referrals, 0)
  into st, goal
  from public.campaigns c
  left join public.packages pk on pk.id = c.package_id
  where c.id = p_campaign_id;

  if st is null then
    raise exception 'Campaign not found';
  end if;

  update public.campaigns
  set referrals_delivered = p_delivered
  where id = p_campaign_id;

  if goal > 0 and p_delivered >= goal and st in ('approved', 'pending_approval') then
    update public.campaigns
    set status = 'completed', completed_at = now(),
        approved_at = coalesce(approved_at, now())
    where id = p_campaign_id;
  elsif st = 'pending_approval' and p_delivered > 0 then
    -- progress without full complete keeps approved if already approved
    null;
  end if;
end;
$$;

grant execute on function public.admin_set_delivery(uuid, int) to authenticated;

-- User submits TX hash after paying
create or replace function public.submit_campaign_tx(p_campaign_id uuid, p_tx_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_tx_hash is null or length(btrim(p_tx_hash)) < 8 then
    raise exception 'Transaction hash required';
  end if;

  perform set_config('rs.internal_campaign_update','on',true);
  update public.campaigns
  set
    tx_hash = btrim(p_tx_hash),
    status = 'pending_approval',
    payment_note = coalesce(payment_note, '') || ' tx_submitted'
  where id = p_campaign_id
    and user_id = auth.uid()
    and status in ('pending_payment', 'pending_approval');

  if not found then
    raise exception 'Order not found or not awaiting payment';
  end if;

  update public.payment_orders
  set status = 'submitted', tx_hash = btrim(p_tx_hash)
  where campaign_id = p_campaign_id and user_id = auth.uid();
end;
$$;

grant execute on function public.submit_campaign_tx(uuid, text) to authenticated;
