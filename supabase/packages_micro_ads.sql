-- Micro ad packages (Facebook/Google budget style). price_usd holds NGN.
-- Safe to re-run.

-- Turn off old large / legacy packs
update public.packages set active = false where referrals >= 1000 and coalesce(price_usd, 0) > 0;
update public.packages set active = false where name in (
  'Spark','Pulse','Wave','Boost','Surge','Orbit','Nova','Galaxy',
  'Vault Lite','Vault Plus','Vault Pro','Vault Max','Vault Elite','Vault Ultra','Vault Prime','Vault Titan',
  '1k Signups','2k Signups','3k Signups','4k Signups','5k Signups','10k Signups','20k Signups','30k Signups',
  '1k Deposits','2k Deposits','3k Deposits','4k Deposits','5k Deposits','10k Deposits','20k Deposits','30k Deposits'
);

-- Helper: upsert one package by category + referrals
-- Free trial
update public.packages
  set name = 'Free trial', price_usd = 0, active = true, referrals = 10
  where category = 'regular' and (price_usd = 0 or name ilike '%free%');
insert into public.packages (name, category, referrals, price_usd, active)
select 'Free trial', 'regular', 10, 0, true
where not exists (select 1 from public.packages where category = 'regular' and price_usd = 0);

-- Signup micro packs
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('10 signups'::text, 'regular'::text, 10, 800),
      ('25 signups', 'regular', 25, 1800),
      ('50 signups', 'regular', 50, 3500),
      ('100 signups', 'regular', 100, 6500),
      ('250 signups', 'regular', 250, 15000),
      ('500 signups', 'regular', 500, 28000),
      ('10 deposits', 'gambling', 10, 1400),
      ('25 deposits', 'gambling', 25, 3250),
      ('50 deposits', 'gambling', 50, 6000),
      ('100 deposits', 'gambling', 100, 11000),
      ('250 deposits', 'gambling', 250, 25000),
      ('500 deposits', 'gambling', 500, 48000)
    ) as v(name, category, referrals, price)
  loop
    update public.packages
      set name = r.name, price_usd = r.price, active = true
      where category = r.category and referrals = r.referrals and price_usd > 0;
    if not found then
      insert into public.packages (name, category, referrals, price_usd, active)
      select r.name, r.category, r.referrals, r.price, true
      where not exists (
        select 1 from public.packages p
        where p.category = r.category and p.referrals = r.referrals and p.price_usd > 0
      );
    end if;
  end loop;
end $$;
