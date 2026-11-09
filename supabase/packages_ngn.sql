-- Realistic NGN package prices (sustainable vs ~₦50/task earn rewards)
update public.packages set active = false;

insert into public.packages (name, category, referrals, price_usd, active) values
  ('Free Starter', 'regular', 50, 0, true),
  ('Spark', 'regular', 1000, 30000, true),
  ('Pulse', 'regular', 2000, 55000, true),
  ('Wave', 'regular', 3000, 80000, true),
  ('Boost', 'regular', 4000, 100000, true),
  ('Surge', 'regular', 5000, 120000, true),
  ('Orbit', 'regular', 10000, 220000, true),
  ('Nova', 'regular', 20000, 400000, true),
  ('Galaxy', 'regular', 30000, 550000, true),
  ('Vault Lite', 'gambling', 1000, 60000, true),
  ('Vault Plus', 'gambling', 2000, 110000, true),
  ('Vault Pro', 'gambling', 3000, 160000, true),
  ('Vault Max', 'gambling', 4000, 200000, true),
  ('Vault Elite', 'gambling', 5000, 240000, true),
  ('Vault Ultra', 'gambling', 10000, 420000, true),
  ('Vault Prime', 'gambling', 20000, 780000, true),
  ('Vault Titan', 'gambling', 30000, 1100000, true);

update public.packages set name = 'Spark', price_usd = 30000, active = true where category = 'regular' and referrals = 1000 and price_usd > 0;
update public.packages set name = 'Pulse', price_usd = 55000, active = true where category = 'regular' and referrals = 2000;
update public.packages set name = 'Wave', price_usd = 80000, active = true where category = 'regular' and referrals = 3000;
update public.packages set name = 'Boost', price_usd = 100000, active = true where category = 'regular' and referrals = 4000;
update public.packages set name = 'Surge', price_usd = 120000, active = true where category = 'regular' and referrals = 5000;
update public.packages set name = 'Orbit', price_usd = 220000, active = true where category = 'regular' and referrals = 10000;
update public.packages set name = 'Nova', price_usd = 400000, active = true where category = 'regular' and referrals = 20000;
update public.packages set name = 'Galaxy', price_usd = 550000, active = true where category = 'regular' and referrals = 30000;
update public.packages set name = 'Vault Lite', price_usd = 60000, active = true where category = 'gambling' and referrals = 1000;
update public.packages set name = 'Vault Plus', price_usd = 110000, active = true where category = 'gambling' and referrals = 2000;
update public.packages set name = 'Vault Pro', price_usd = 160000, active = true where category = 'gambling' and referrals = 3000;
update public.packages set name = 'Vault Max', price_usd = 200000, active = true where category = 'gambling' and referrals = 4000;
update public.packages set name = 'Vault Elite', price_usd = 240000, active = true where category = 'gambling' and referrals = 5000;
update public.packages set name = 'Vault Ultra', price_usd = 420000, active = true where category = 'gambling' and referrals = 10000;
update public.packages set name = 'Vault Prime', price_usd = 780000, active = true where category = 'gambling' and referrals = 20000;
update public.packages set name = 'Vault Titan', price_usd = 1100000, active = true where category = 'gambling' and referrals = 30000;
update public.packages set name = 'Free Starter', price_usd = 0, referrals = 50, active = true
  where category = 'regular' and (price_usd = 0 or name = 'Free Starter');

-- Align task rewards to Naira (~₦50)
update public.tasks set reward_amount = 50 where reward_amount <= 100 or reward_amount < 1;
