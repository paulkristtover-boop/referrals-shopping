-- Run in Supabase SQL Editor

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  balance numeric(12,2) not null default 0,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('regular','gambling')),
  referrals int not null,
  price_usd numeric(10,2) not null,
  active boolean not null default true
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  title text not null,
  target_url text not null,
  status text not null default 'pending_payment',
  paid_amount numeric(10,2),
  crypto_chain text,
  payment_note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  reward_amount numeric(10,2) not null default 15,
  wait_seconds int not null default 15,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  screenshot_url text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (task_id, user_id)
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  crypto_chain text not null,
  wallet_address text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

insert into public.packages (name, category, referrals, price_usd)
select * from (values
  ('1000 referrals', 'regular', 1000, 50),
  ('1900 referrals', 'regular', 1900, 100),
  ('3800 referrals', 'regular', 3800, 200),
  ('1000 referrals (gambling)', 'gambling', 1000, 100),
  ('1900 referrals (gambling)', 'gambling', 1900, 200),
  ('3800 referrals (gambling)', 'gambling', 3800, 400)
) as v(name, category, referrals, price_usd)
where not exists (select 1 from public.packages limit 1);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.campaigns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.withdrawals enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "profiles_select" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update" on public.profiles for update using (auth.uid() = id or public.is_admin());
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "packages_select" on public.packages for select using (true);
create policy "packages_admin_all" on public.packages for all using (public.is_admin());
create policy "campaigns_select" on public.campaigns for select using (auth.uid() = user_id or public.is_admin());
create policy "campaigns_insert" on public.campaigns for insert with check (auth.uid() = user_id);
create policy "campaigns_update" on public.campaigns for update using (auth.uid() = user_id or public.is_admin());
create policy "tasks_select" on public.tasks for select using (
  public.is_admin() or exists (select 1 from public.campaigns c where c.id = campaign_id and c.status = 'approved')
);
create policy "tasks_insert" on public.tasks for insert with check (public.is_admin());
create policy "subs_select" on public.task_submissions for select using (auth.uid() = user_id or public.is_admin());
create policy "subs_insert" on public.task_submissions for insert with check (auth.uid() = user_id);
create policy "subs_update" on public.task_submissions for update using (auth.uid() = user_id or public.is_admin());
create policy "wd_select" on public.withdrawals for select using (auth.uid() = user_id or public.is_admin());
create policy "wd_insert" on public.withdrawals for insert with check (auth.uid() = user_id);
create policy "wd_update" on public.withdrawals for update using (public.is_admin());

create or replace function public.admin_approve_campaign(p_campaign_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'not admin';
  end if;
  update campaigns set status = 'approved', approved_at = now() where id = p_campaign_id and status = 'pending_approval';
  insert into tasks (campaign_id, reward_amount, wait_seconds, active) values (p_campaign_id, 15, 15, true);
end;
$$;

create or replace function public.admin_approve_submission(p_submission_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'not admin';
  end if;
  select s.*, t.reward_amount into r from task_submissions s join tasks t on t.id = s.task_id where s.id = p_submission_id and s.status = 'pending';
  if not found then return; end if;
  update task_submissions set status = 'approved', reviewed_at = now() where id = p_submission_id;
  perform set_config('rs.internal_profile_update','on',true);
  update profiles set balance = balance + r.reward_amount where id = r.user_id;
end;
$$;

-- Storage: create public bucket "screenshots" in Dashboard if insert fails
