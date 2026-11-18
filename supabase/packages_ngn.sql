-- Legacy migration retained for existing setup instructions.
-- Current authoritative package schedule is supabase/packages_smallbiz.sql.
update public.packages set active = false;
insert into public.packages (name, category, referrals, price_usd, active) values
('Free Starter','regular',50,0,true),
('Mini','regular',250,6900,true),('Starter','regular',500,13500,true),
('Spark','regular',1000,25900,true),('Pulse','regular',2000,49900,true),
('Wave','regular',3000,73900,true),('Boost','regular',4000,97900,true),
('Surge','regular',5000,119900,true),('Orbit','regular',10000,229000,true),
('Nova','regular',20000,449000,true),('Galaxy','regular',30000,649000,true),
('Vault Mini','gambling',250,7500,true),('Vault Starter','gambling',500,14900,true),
('Vault Lite','gambling',1000,28500,true),('Vault Plus','gambling',2000,54900,true),
('Vault Pro','gambling',3000,81500,true),('Vault Max','gambling',4000,107500,true),
('Vault Elite','gambling',5000,131500,true),('Vault Ultra','gambling',10000,252000,true),
('Vault Prime','gambling',20000,494000,true),('Vault Titan','gambling',30000,714000,true);
-- Do not overwrite existing task rewards here; use packages_smallbiz.sql,
-- which preserves rewards on tasks that already have submissions.
