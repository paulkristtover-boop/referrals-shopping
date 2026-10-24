-- Fix RLS infinite recursion + ensure policies work for dashboard
-- Run this in Supabase SQL Editor

-- Helper: check admin without recursive RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Drop old policies if they exist
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "packages read" on public.packages;
drop policy if exists "campaigns own" on public.campaigns;
drop policy if exists "tasks read approved" on public.tasks;
drop policy if exists "tasks admin insert" on public.tasks;
drop policy if exists "subs own" on public.task_submissions;
drop policy if exists "withdrawals own" on public.withdrawals;

-- Profiles
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Packages (public read)
create policy "packages_select" on public.packages
  for select using (true);

create policy "packages_admin_all" on public.packages
  for all using (public.is_admin());

-- Campaigns
create policy "campaigns_select" on public.campaigns
  for select using (auth.uid() = user_id or public.is_admin());

create policy "campaigns_insert" on public.campaigns
  for insert with check (auth.uid() = user_id);

create policy "campaigns_update" on public.campaigns
  for update using (auth.uid() = user_id or public.is_admin());

create policy "campaigns_delete" on public.campaigns
  for delete using (public.is_admin());

-- Tasks
create policy "tasks_select" on public.tasks
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.status = 'approved'
    )
  );

create policy "tasks_insert" on public.tasks
  for insert with check (public.is_admin());

create policy "tasks_update" on public.tasks
  for update using (public.is_admin());

-- Submissions
create policy "subs_select" on public.task_submissions
  for select using (auth.uid() = user_id or public.is_admin());

create policy "subs_insert" on public.task_submissions
  for insert with check (auth.uid() = user_id);

create policy "subs_update" on public.task_submissions
  for update using (auth.uid() = user_id or public.is_admin());

-- Withdrawals
create policy "wd_select" on public.withdrawals
  for select using (auth.uid() = user_id or public.is_admin());

create policy "wd_insert" on public.withdrawals
  for insert with check (auth.uid() = user_id);

create policy "wd_update" on public.withdrawals
  for update using (public.is_admin());

-- Ensure profile row exists for current users missing one
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
