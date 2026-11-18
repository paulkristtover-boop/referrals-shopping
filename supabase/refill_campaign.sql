-- Refill / renew incomplete promotions (remaining referrals)

alter table public.campaigns
  add column if not exists delivered_count integer not null default 0,
  add column if not exists refilled_from uuid references public.campaigns(id);

create or replace function public.refill_campaign(p_campaign_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  pkg record;
  ordered int;
  delivered int;
  remaining int;
  pay numeric;
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into c from public.campaigns where id = p_campaign_id for update;
  if c is null then raise exception 'Order not found'; end if;
  if c.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if c.status not in ('approved', 'completed') then
    raise exception 'Only approved or completed orders can be refilled';
  end if;

  select * into pkg from public.packages where id = c.package_id;
  ordered := coalesce(pkg.referrals, 0);
  delivered := coalesce(c.delivered_count, 0);
  remaining := ordered - delivered;
  if remaining <= 0 then
    raise exception 'Order already fully delivered — nothing to refill';
  end if;

  -- Proportional Naira price for remaining volume (min 1000)
  if ordered > 0 and coalesce(c.paid_amount, 0) > 0 then
    pay := greatest(1000, round((remaining::numeric / ordered::numeric) * c.paid_amount));
  else
    pay := greatest(1000, coalesce(pkg.price_usd, 1000));
  end if;

  perform set_config('rs.internal_campaign_update','on',true);
  insert into public.campaigns (
    user_id, package_id, title, target_url, description, sample_screenshot_url,
    status, paid_amount, delivered_count, refilled_from, crypto_chain
  ) values (
    c.user_id, c.package_id,
    coalesce(c.title, 'Refill') || ' (refill ' || remaining || ')',
    c.target_url, c.description, c.sample_screenshot_url,
    'pending_payment', pay, 0, c.id, 'ngn_flw'
  ) returning id into new_id;

  insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
  values (
    auth.uid(), 'campaign.refilled', 'campaign', new_id::text,
    jsonb_build_object('from', p_campaign_id, 'remaining', remaining, 'amount_ngn', pay)
  );

  return new_id;
end;
$$;

grant execute on function public.refill_campaign(uuid) to authenticated;
