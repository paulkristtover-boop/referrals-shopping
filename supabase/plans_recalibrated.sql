-- Recalibrate free trial + paid packages (₦ in price_usd column)
-- Safe to re-run.

-- 1) Free trial package: 5 signup results
update public.packages
  set active = false
  where price_usd = 0 and category = 'regular';

insert into public.packages (name, category, referrals, price_usd, active)
select 'Free trial', 'regular', 5, 0, true
where not exists (
  select 1 from public.packages
  where category = 'regular' and price_usd = 0 and referrals = 5
);

update public.packages
  set name = 'Free trial', referrals = 5, price_usd = 0, active = true
  where category = 'regular' and price_usd = 0;

-- 2) Deactivate legacy packs (old 50 free, 1k+ vaults, previous micro 10/25)
update public.packages set active = false
  where price_usd > 0
    and (
      referrals in (10, 25, 1000, 2000, 3000, 4000, 5000, 10000, 20000, 30000)
      or name ilike '%vault%'
      or name in ('Spark','Pulse','Wave','Boost','Surge','Orbit','Nova','Galaxy')
    );

-- 3) Upsert paid signup + deposit packs
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('Starter'::text, 'regular'::text, 20, 1500),
      ('Boost', 'regular', 50, 3500),
      ('Growth', 'regular', 100, 6500),
      ('Pro', 'regular', 250, 15000),
      ('Scale', 'regular', 500, 28000),
      ('Starter+', 'gambling', 20, 2700),
      ('Boost+', 'gambling', 50, 6300),
      ('Growth+', 'gambling', 100, 12000),
      ('Pro+', 'gambling', 250, 27000),
      ('Scale+', 'gambling', 500, 50000)
    ) as v(name, category, referrals, price)
  loop
    update public.packages
      set name = r.name, price_usd = r.price, active = true
      where category = r.category and referrals = r.referrals and coalesce(price_usd, 0) > 0;
    if not found then
      insert into public.packages (name, category, referrals, price_usd, active)
      select r.name, r.category, r.referrals, r.price, true
      where not exists (
        select 1 from public.packages p
        where p.category = r.category and p.referrals = r.referrals and coalesce(p.price_usd, 0) > 0
      );
    end if;
  end loop;
end $$;

-- 4) claim_free_starter → 5 refs, modest task reward (₦25)
create or replace function public.claim_free_starter(
  p_title text,
  p_target_url text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pkg_id uuid;
  camp_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.profiles
    where id = uid and free_starter_used_at is not null
  ) then
    raise exception 'Free trial already used on this account';
  end if;

  if public.is_admin() then
    raise exception 'Admins cannot claim free trial';
  end if;

  select id into pkg_id
  from public.packages
  where active = true and price_usd = 0 and category = 'regular' and referrals = 5
  order by created_at desc nulls last
  limit 1;

  if pkg_id is null then
    raise exception 'Free trial package not found — run plans_recalibrated.sql';
  end if;

  insert into public.campaigns (
    user_id, package_id, title, target_url, status, paid_amount, crypto_chain, payment_note, approved_at
  ) values (
    uid, pkg_id, p_title, p_target_url, 'approved', 0, null, 'free_trial', now()
  )
  returning id into camp_id;

  insert into public.tasks (campaign_id, reward_amount, wait_seconds, active)
  values (camp_id, 25, 20, true);

  update public.profiles
  set free_starter_used_at = now()
  where id = uid;

  return camp_id;
end;
$$;

grant execute on function public.claim_free_starter(text, text) to authenticated;
