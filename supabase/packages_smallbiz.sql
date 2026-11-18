-- Referrals Shopping package pricing migration.
-- Run after schema.sql and features.sql. Amounts are NGN even though the
-- legacy column is named price_usd; the application treats it as NGN.

-- Keep the existing package rows (campaigns may reference them), update by
-- category + referral quantity, and insert missing tiers.
update public.packages p
set name = v.name,
    price_usd = v.price_ngn,
    active = true
from (values
  ('regular', 50, 'Free Starter', 0::numeric),
  ('regular', 1000, 'Spark', 30000::numeric),
  ('regular', 2000, 'Pulse', 55000::numeric),
  ('regular', 3000, 'Wave', 80000::numeric),
  ('regular', 4000, 'Boost', 100000::numeric),
  ('regular', 5000, 'Surge', 120000::numeric),
  ('regular', 10000, 'Orbit', 220000::numeric),
  ('regular', 20000, 'Nova', 400000::numeric),
  ('regular', 30000, 'Galaxy', 550000::numeric),
  ('gambling', 1000, 'Vault Lite', 60000::numeric),
  ('gambling', 2000, 'Vault Plus', 110000::numeric),
  ('gambling', 3000, 'Vault Pro', 160000::numeric),
  ('gambling', 4000, 'Vault Max', 200000::numeric),
  ('gambling', 5000, 'Vault Elite', 240000::numeric),
  ('gambling', 10000, 'Vault Ultra', 420000::numeric),
  ('gambling', 20000, 'Vault Prime', 780000::numeric),
  ('gambling', 30000, 'Vault Titan', 1100000::numeric)
) as v(category, referrals, name, price_ngn)
where p.category = v.category and p.referrals = v.referrals;

insert into public.packages (name, category, referrals, price_usd, active)
select v.name, v.category, v.referrals, v.price_ngn, true
from (values
  ('Free Starter', 'regular', 50, 0::numeric),
  ('Spark', 'regular', 1000, 30000::numeric),
  ('Pulse', 'regular', 2000, 55000::numeric),
  ('Wave', 'regular', 3000, 80000::numeric),
  ('Boost', 'regular', 4000, 100000::numeric),
  ('Surge', 'regular', 5000, 120000::numeric),
  ('Orbit', 'regular', 10000, 220000::numeric),
  ('Nova', 'regular', 20000, 400000::numeric),
  ('Galaxy', 'regular', 30000, 550000::numeric),
  ('Vault Lite', 'gambling', 1000, 60000::numeric),
  ('Vault Plus', 'gambling', 2000, 110000::numeric),
  ('Vault Pro', 'gambling', 3000, 160000::numeric),
  ('Vault Max', 'gambling', 4000, 200000::numeric),
  ('Vault Elite', 'gambling', 5000, 240000::numeric),
  ('Vault Ultra', 'gambling', 10000, 420000::numeric),
  ('Vault Prime', 'gambling', 20000, 780000::numeric),
  ('Vault Titan', 'gambling', 30000, 1100000::numeric)
) as v(name, category, referrals, price_ngn)
where not exists (
  select 1 from public.packages p
  where p.category = v.category and p.referrals = v.referrals
);

-- Disable obsolete package sizes, without deleting rows referenced by campaigns.
update public.packages p
set active = false
where not exists (
  select 1 from (values
    ('regular', 50), ('regular',1000), ('regular',2000), ('regular',3000),
    ('regular',4000), ('regular',5000), ('regular',10000), ('regular',20000),
    ('regular',30000), ('gambling',1000), ('gambling',2000), ('gambling',3000),
    ('gambling',4000), ('gambling',5000), ('gambling',10000), ('gambling',20000),
    ('gambling',30000)
  ) as allowed(category, referrals)
  where allowed.category = p.category and allowed.referrals = p.referrals
);

-- Keep the default reward consistent with the current application configuration.
update public.tasks set reward_amount = 50 where reward_amount is null or reward_amount <= 100;
