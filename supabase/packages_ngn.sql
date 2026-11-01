-- Referral packages (Sites, Channels, Bots, Groups)
-- Source USD tiers × 1600 NGN; prices stored in price_usd column as Naira values.

update public.packages set active = false;

-- Regular (signup only)
insert into public.packages (name, category, referrals, price_usd, active) values
  ('Free Starter', 'regular', 50, 0, true),
  ('R-1K', 'regular', 1000, 12800, true),
  ('R-2K', 'regular', 2000, 16000, true),
  ('R-3K', 'regular', 3000, 24000, true),
  ('R-4K', 'regular', 4000, 32000, true),
  ('R-5K', 'regular', 5000, 40000, true),
  ('R-10K', 'regular', 10000, 80000, true),
  ('R-20K', 'regular', 20000, 160000, true),
  ('R-30K', 'regular', 30000, 240000, true),
  -- Investment / Deposit (signup + deposit) — 2× regular
  ('D-1K', 'gambling', 1000, 25600, true),
  ('D-2K', 'gambling', 2000, 32000, true),
  ('D-3K', 'gambling', 3000, 48000, true),
  ('D-4K', 'gambling', 4000, 64000, true),
  ('D-5K', 'gambling', 5000, 80000, true),
  ('D-10K', 'gambling', 10000, 160000, true),
  ('D-20K', 'gambling', 20000, 320000, true),
  ('D-30K', 'gambling', 30000, 480000, true);

-- Friendly display names (if insert created short codes, update labels)
update public.packages set name = '1,000 referrals' where category = 'regular' and referrals = 1000 and price_usd = 12800;
update public.packages set name = '2,000 referrals' where category = 'regular' and referrals = 2000;
update public.packages set name = '3,000 referrals' where category = 'regular' and referrals = 3000;
update public.packages set name = '4,000 referrals' where category = 'regular' and referrals = 4000;
update public.packages set name = '5,000 referrals' where category = 'regular' and referrals = 5000;
update public.packages set name = '10,000 referrals' where category = 'regular' and referrals = 10000;
update public.packages set name = '20,000 referrals' where category = 'regular' and referrals = 20000;
update public.packages set name = '30,000 referrals' where category = 'regular' and referrals = 30000;

update public.packages set name = '1,000 deposit refs' where category = 'gambling' and referrals = 1000 and price_usd in (25600, 30000);
update public.packages set name = '2,000 deposit refs' where category = 'gambling' and referrals = 2000;
update public.packages set name = '3,000 deposit refs' where category = 'gambling' and referrals = 3000;
update public.packages set name = '4,000 deposit refs' where category = 'gambling' and referrals = 4000;
update public.packages set name = '5,000 deposit refs' where category = 'gambling' and referrals = 5000;
update public.packages set name = '10,000 deposit refs' where category = 'gambling' and referrals = 10000;
update public.packages set name = '20,000 deposit refs' where category = 'gambling' and referrals = 20000;
update public.packages set name = '30,000 deposit refs' where category = 'gambling' and referrals = 30000;

update public.packages set name = 'Free Starter', active = true, price_usd = 0, referrals = 50
  where name = 'Free Starter' or (price_usd = 0 and category = 'regular' and referrals = 50);
