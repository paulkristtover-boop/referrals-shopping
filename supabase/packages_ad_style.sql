-- Ad-style micro packages. Run in Supabase SQL Editor (replaces old large tiers).
-- Deactivates previous packages, inserts new active rows.

update public.packages set active = false where active = true;

-- Regular (signup)
insert into public.packages (name, category, referrals, price_usd, active) values
  ('25 signups', 'regular', 25, 2500, true),
  ('100 signups', 'regular', 100, 9000, true),
  ('250 signups', 'regular', 250, 20000, true),
  ('500 signups', 'regular', 500, 37500, true),
  ('1,000 signups', 'regular', 1000, 70000, true),
  ('2,500 signups', 'regular', 2500, 160000, true),
  ('5,000 signups', 'regular', 5000, 300000, true),
  ('Free Starter', 'regular', 50, 0, true);

-- Deposit
insert into public.packages (name, category, referrals, price_usd, active) values
  ('25 deposits', 'gambling', 25, 4500, true),
  ('100 deposits', 'gambling', 100, 16000, true),
  ('250 deposits', 'gambling', 250, 37500, true),
  ('500 deposits', 'gambling', 500, 70000, true),
  ('1,000 deposits', 'gambling', 1000, 130000, true),
  ('2,500 deposits', 'gambling', 2500, 300000, true),
  ('5,000 deposits', 'gambling', 5000, 550000, true);
