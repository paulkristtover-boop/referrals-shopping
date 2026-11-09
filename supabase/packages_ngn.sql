-- Named referral packages (Naira). price_usd column stores NGN amounts.

update public.packages set active = false;

-- Upsert by deactivating old and inserting current set
insert into public.packages (name, category, referrals, price_usd, active) values
  ('Free Starter', 'regular', 50, 0, true),
  ('Spark', 'regular', 1000, 12800, true),
  ('Pulse', 'regular', 2000, 16000, true),
  ('Wave', 'regular', 3000, 24000, true),
  ('Boost', 'regular', 4000, 32000, true),
  ('Surge', 'regular', 5000, 40000, true),
  ('Orbit', 'regular', 10000, 80000, true),
  ('Nova', 'regular', 20000, 160000, true),
  ('Galaxy', 'regular', 30000, 240000, true),
  ('Vault Lite', 'gambling', 1000, 25600, true),
  ('Vault Plus', 'gambling', 2000, 32000, true),
  ('Vault Pro', 'gambling', 3000, 48000, true),
  ('Vault Max', 'gambling', 4000, 64000, true),
  ('Vault Elite', 'gambling', 5000, 80000, true),
  ('Vault Ultra', 'gambling', 10000, 160000, true),
  ('Vault Prime', 'gambling', 20000, 320000, true),
  ('Vault Titan', 'gambling', 30000, 480000, true);

-- Re-activate / fix names if rows already existed under old labels
update public.packages set name = 'Spark', price_usd = 12800, active = true where category = 'regular' and referrals = 1000 and price_usd > 0;
update public.packages set name = 'Pulse', price_usd = 16000, active = true where category = 'regular' and referrals = 2000;
update public.packages set name = 'Wave', price_usd = 24000, active = true where category = 'regular' and referrals = 3000;
update public.packages set name = 'Boost', price_usd = 32000, active = true where category = 'regular' and referrals = 4000;
update public.packages set name = 'Surge', price_usd = 40000, active = true where category = 'regular' and referrals = 5000;
update public.packages set name = 'Orbit', price_usd = 80000, active = true where category = 'regular' and referrals = 10000;
update public.packages set name = 'Nova', price_usd = 160000, active = true where category = 'regular' and referrals = 20000;
update public.packages set name = 'Galaxy', price_usd = 240000, active = true where category = 'regular' and referrals = 30000;
update public.packages set name = 'Vault Lite', price_usd = 25600, active = true where category = 'gambling' and referrals = 1000;
update public.packages set name = 'Vault Plus', price_usd = 32000, active = true where category = 'gambling' and referrals = 2000;
update public.packages set name = 'Vault Pro', price_usd = 48000, active = true where category = 'gambling' and referrals = 3000;
update public.packages set name = 'Vault Max', price_usd = 64000, active = true where category = 'gambling' and referrals = 4000;
update public.packages set name = 'Vault Elite', price_usd = 80000, active = true where category = 'gambling' and referrals = 5000;
update public.packages set name = 'Vault Ultra', price_usd = 160000, active = true where category = 'gambling' and referrals = 10000;
update public.packages set name = 'Vault Prime', price_usd = 320000, active = true where category = 'gambling' and referrals = 20000;
update public.packages set name = 'Vault Titan', price_usd = 480000, active = true where category = 'gambling' and referrals = 30000;
update public.packages set name = 'Free Starter', price_usd = 0, referrals = 50, active = true
  where category = 'regular' and (name = 'Free Starter' or (price_usd = 0 and referrals = 50));
