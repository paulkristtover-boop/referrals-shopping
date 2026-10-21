-- PART 3/5: Signup trigger + seed packages
-- Paste and Run after part 2 succeeds

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed packages (skip if already inserted)
insert into public.packages (name, type, referrals_count, price_usd)
select * from (values
  ('Starter Regular', 'regular', 1000, 50.00),
  ('Growth Regular', 'regular', 1900, 100.00),
  ('Pro Regular', 'regular', 3800, 200.00),
  ('Starter Gambling', 'gambling', 1000, 100.00),
  ('Growth Gambling', 'gambling', 1900, 200.00),
  ('Pro Gambling', 'gambling', 3800, 400.00)
) as v(name, type, referrals_count, price_usd)
where not exists (select 1 from public.packages limit 1);
