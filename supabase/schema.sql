-- Referrals Shopping - Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  balance numeric(12, 2) not null default 0,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Packages
create table public.packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('regular', 'gambling')),
  referrals_count integer not null,
  price_usd numeric(10, 2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Campaigns (Promote side)
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  title text not null,
  description text,
  referral_link text not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'pending_approval', 'approved', 'rejected', 'completed', 'paused')),
  paid_amount numeric(12, 2),
  crypto_currency text check (crypto_currency in ('TRX', 'SOL', 'TON')),
  deposit_address text,
  deposit_reference text,
  tx_hash text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tasks generated from approved campaigns
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  required_wait_seconds integer not null default 30,
  reward_amount numeric(10, 2) not null default 0.10,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  max_completions integer, -- null = unlimited until package quota
  current_completions integer not null default 0,
  created_at timestamptz not null default now()
);

-- Task submissions (Earn side)
create table public.task_submissions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  screenshot_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  earned_amount numeric(10, 2),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (task_id, user_id) -- one submission per user per task
);

-- Transactions (deposits, earnings, withdrawals)
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'earning', 'withdrawal', 'refund')),
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  crypto_currency text,
  tx_hash text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'cancelled')),
  reference_id uuid, -- campaign_id or submission_id etc.
  notes text,
  created_at timestamptz not null default now()
);

-- Withdrawals
create table public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  crypto_currency text not null check (crypto_currency in ('TRX', 'SOL', 'TON')),
  address text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'rejected')),
  tx_hash text,
  admin_notes text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_campaigns_user on public.campaigns(user_id);
create index idx_campaigns_status on public.campaigns(status);
create index idx_tasks_campaign on public.tasks(campaign_id);
create index idx_submissions_user on public.task_submissions(user_id);
create index idx_submissions_status on public.task_submissions(status);
create index idx_transactions_user on public.transactions(user_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.campaigns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Packages: everyone can read active
create policy "Anyone can read active packages"
  on public.packages for select using (active = true);
create policy "Admins full access packages"
  on public.packages for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Campaigns
create policy "Users manage own campaigns"
  on public.campaigns for all using (auth.uid() = user_id);
create policy "Admins full access campaigns"
  on public.campaigns for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Tasks: authenticated users can read active
create policy "Users can read active tasks"
  on public.tasks for select using (status = 'active');
create policy "Admins full access tasks"
  on public.tasks for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Submissions
create policy "Users manage own submissions"
  on public.task_submissions for all using (auth.uid() = user_id);
create policy "Admins full access submissions"
  on public.task_submissions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Transactions
create policy "Users view own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Admins full access transactions"
  on public.transactions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Withdrawals
create policy "Users manage own withdrawals"
  on public.withdrawals for all using (auth.uid() = user_id);
create policy "Admins full access withdrawals"
  on public.withdrawals for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Function: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed packages
insert into public.packages (name, type, referrals_count, price_usd) values
  ('Starter Regular', 'regular', 1000, 50.00),
  ('Growth Regular', 'regular', 1900, 100.00),
  ('Pro Regular', 'regular', 3800, 200.00),
  ('Starter Gambling', 'gambling', 1000, 100.00),
  ('Growth Gambling', 'gambling', 1900, 200.00),
  ('Pro Gambling', 'gambling', 3800, 400.00);

-- ============================================================
-- Storage bucket for screenshots (run after creating bucket
-- named "screenshots" in Supabase Dashboard → Storage)
-- ============================================================

-- Allow authenticated users to upload their own screenshots
-- Path convention: {user_id}/{submission_or_timestamp}.jpg

-- Note: Create the bucket "screenshots" as PUBLIC or with policies below.
-- In SQL (if using storage schema):

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

create policy "Users can upload screenshots"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view screenshots"
  on storage.objects for select
  using (bucket_id = 'screenshots');

create policy "Users can update own screenshots"
  on storage.objects for update
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own screenshots"
  on storage.objects for delete
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- RPC: Admin approves campaign → creates task from package quota
-- ============================================================
create or replace function public.admin_approve_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
  v_campaign public.campaigns%rowtype;
  v_package public.packages%rowtype;
  v_reward numeric(10,2);
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can approve campaigns';
  end if;

  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception 'Campaign not found';
  end if;

  if v_campaign.status not in ('pending_approval', 'pending_payment') then
    raise exception 'Campaign is not awaiting approval';
  end if;

  select * into v_package from public.packages where id = v_campaign.package_id;

  -- Simple reward: total package price / referrals * 0.6 (platform keeps ~40%)
  -- Or fixed small amount. Here we use $0.05–$0.15 style default.
  v_reward := greatest(0.05, least(0.50, (v_package.price_usd / v_package.referrals_count) * 0.5));

  update public.campaigns
  set status = 'approved',
      paid_amount = coalesce(paid_amount, v_package.price_usd),
      updated_at = now()
  where id = p_campaign_id;

  insert into public.tasks (
    campaign_id,
    required_wait_seconds,
    reward_amount,
    status,
    max_completions,
    current_completions
  ) values (
    p_campaign_id,
    30,
    round(v_reward, 2),
    'active',
    v_package.referrals_count,
    0
  );
end;
$$;

-- ============================================================
-- RPC: Admin rejects campaign
-- ============================================================
create or replace function public.admin_reject_campaign(p_campaign_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can reject campaigns';
  end if;

  update public.campaigns
  set status = 'rejected',
      admin_notes = p_notes,
      updated_at = now()
  where id = p_campaign_id
    and status in ('pending_approval', 'pending_payment');
end;
$$;

-- ============================================================
-- RPC: Admin approves task submission → credit balance
-- ============================================================
create or replace function public.admin_approve_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
  v_sub public.task_submissions%rowtype;
  v_task public.tasks%rowtype;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can approve submissions';
  end if;

  select * into v_sub from public.task_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Submission not found';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'Submission already reviewed';
  end if;

  select * into v_task from public.tasks where id = v_sub.task_id for update;

  update public.task_submissions
  set status = 'approved',
      earned_amount = v_task.reward_amount,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_submission_id;

  -- Credit user balance
  update public.profiles
  set balance = balance + v_task.reward_amount,
      updated_at = now()
  where id = v_sub.user_id;

  -- Record earning transaction
  insert into public.transactions (user_id, type, amount, currency, status, reference_id, notes)
  values (
    v_sub.user_id,
    'earning',
    v_task.reward_amount,
    'USD',
    'completed',
    p_submission_id,
    'Task completion reward'
  );

  -- Increment task completions
  update public.tasks
  set current_completions = current_completions + 1,
      status = case
        when max_completions is not null and current_completions + 1 >= max_completions
        then 'completed'
        else status
      end
  where id = v_sub.task_id;
end;
$$;

-- ============================================================
-- RPC: Admin rejects submission
-- ============================================================
create or replace function public.admin_reject_submission(p_submission_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can reject submissions';
  end if;

  update public.task_submissions
  set status = 'rejected',
      admin_notes = p_notes,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_submission_id
    and status = 'pending';
end;
$$;

-- Allow users to insert their own transactions for deposits (pending)
create policy "Users can insert own deposit transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id and type = 'deposit');

-- Allow authenticated users to insert campaigns (already covered by "Users manage own")
-- Packages insert policy for admins already exists

grant execute on function public.admin_approve_campaign(uuid) to authenticated;
grant execute on function public.admin_reject_campaign(uuid, text) to authenticated;
grant execute on function public.admin_approve_submission(uuid) to authenticated;
grant execute on function public.admin_reject_submission(uuid, text) to authenticated;

-- Allow authenticated users to read approved campaigns (needed for Earn task joins)
create policy "Users can read approved campaigns"
  on public.campaigns for select
  using (status = 'approved' or auth.uid() = user_id);
