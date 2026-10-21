-- PART 1/5: Tables
-- Paste and Run this first

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  balance numeric(12, 2) not null default 0,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('regular', 'gambling')),
  referrals_count integer not null,
  price_usd numeric(10, 2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
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

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  required_wait_seconds integer not null default 30,
  reward_amount numeric(10, 2) not null default 0.10,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  max_completions integer,
  current_completions integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_submissions (
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
  unique (task_id, user_id)
);

create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'earning', 'withdrawal', 'refund')),
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  crypto_currency text,
  tx_hash text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'cancelled')),
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
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

create index if not exists idx_campaigns_user on public.campaigns(user_id);
create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_tasks_campaign on public.tasks(campaign_id);
create index if not exists idx_submissions_user on public.task_submissions(user_id);
create index if not exists idx_submissions_status on public.task_submissions(status);
create index if not exists idx_transactions_user on public.transactions(user_id);
