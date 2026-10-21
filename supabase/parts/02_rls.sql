-- PART 2/5: Row Level Security
-- Paste and Run after part 1 succeeds

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.campaigns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Packages
drop policy if exists "Anyone can read active packages" on public.packages;
create policy "Anyone can read active packages"
  on public.packages for select using (active = true);

drop policy if exists "Admins full access packages" on public.packages;
create policy "Admins full access packages"
  on public.packages for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Campaigns
drop policy if exists "Users manage own campaigns" on public.campaigns;
create policy "Users manage own campaigns"
  on public.campaigns for all using (auth.uid() = user_id);

drop policy if exists "Admins full access campaigns" on public.campaigns;
create policy "Admins full access campaigns"
  on public.campaigns for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Users can read approved campaigns" on public.campaigns;
create policy "Users can read approved campaigns"
  on public.campaigns for select
  using (status = 'approved' or auth.uid() = user_id);

-- Tasks
drop policy if exists "Users can read active tasks" on public.tasks;
create policy "Users can read active tasks"
  on public.tasks for select using (status = 'active');

drop policy if exists "Admins full access tasks" on public.tasks;
create policy "Admins full access tasks"
  on public.tasks for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Submissions
drop policy if exists "Users manage own submissions" on public.task_submissions;
create policy "Users manage own submissions"
  on public.task_submissions for all using (auth.uid() = user_id);

drop policy if exists "Admins full access submissions" on public.task_submissions;
create policy "Admins full access submissions"
  on public.task_submissions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Transactions
drop policy if exists "Users view own transactions" on public.transactions;
create policy "Users view own transactions"
  on public.transactions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own deposit transactions" on public.transactions;
create policy "Users can insert own deposit transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id and type = 'deposit');

drop policy if exists "Admins full access transactions" on public.transactions;
create policy "Admins full access transactions"
  on public.transactions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Withdrawals
drop policy if exists "Users manage own withdrawals" on public.withdrawals;
create policy "Users manage own withdrawals"
  on public.withdrawals for all using (auth.uid() = user_id);

drop policy if exists "Admins full access withdrawals" on public.withdrawals;
create policy "Admins full access withdrawals"
  on public.withdrawals for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
