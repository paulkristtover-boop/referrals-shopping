begin;
-- Referrals Shopping sustainable NGN price schedule.
-- One approved referral costs ₦15 in earner rewards. Prices include a
-- contribution margin for payment fees, support, tax and platform operations.
-- Legacy column price_usd is retained by the schema but stores Naira values.
create temporary table rs_package_seed(name text, category text, referrals integer, price_ngn numeric) on commit drop;
insert into rs_package_seed values
('Free Starter','regular',50,0),
('Mini','regular',250,6900),('Starter','regular',500,13500),
('Spark','regular',1000,25900),('Pulse','regular',2000,49900),
('Wave','regular',3000,73900),('Boost','regular',4000,97900),
('Surge','regular',5000,119900),('Orbit','regular',10000,229000),
('Nova','regular',20000,449000),('Galaxy','regular',30000,649000),
('Vault Mini','gambling',250,7500),('Vault Starter','gambling',500,14900),
('Vault Lite','gambling',1000,28500),('Vault Plus','gambling',2000,54900),
('Vault Pro','gambling',3000,81500),('Vault Max','gambling',4000,107500),
('Vault Elite','gambling',5000,131500),('Vault Ultra','gambling',10000,252000),
('Vault Prime','gambling',20000,494000),('Vault Titan','gambling',30000,714000);
update public.packages p set name=s.name, price_usd=s.price_ngn, active=true
from rs_package_seed s where p.category=s.category and p.referrals=s.referrals;
insert into public.packages(name,category,referrals,price_usd,active)
select s.name,s.category,s.referrals,s.price_ngn,true from rs_package_seed s
where not exists(select 1 from public.packages p where p.category=s.category and p.referrals=s.referrals);
update public.packages p set active=false
where not exists(select 1 from rs_package_seed s where s.category=p.category and s.referrals=p.referrals);
-- Keep only one active row per tier if previous migrations created duplicates.
with ranked as (
  select id, category, referrals, row_number() over (partition by category, referrals order by id) as rn
  from public.packages
)
update public.packages p set active = (ranked.rn = 1 and exists (
  select 1 from rs_package_seed s where s.category = ranked.category and s.referrals = ranked.referrals
)) from ranked where ranked.id = p.id;
-- Reward stays ₦15. Change only untouched active tasks; do not alter a reward
-- after any earner has already submitted proof against that task.
alter table public.tasks alter column reward_amount set default 15;
update public.tasks t set reward_amount = 15
where t.active = true and not exists (
  select 1 from public.task_submissions s where s.task_id = t.id
);
commit;
