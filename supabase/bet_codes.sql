-- Daily / anytime MSport booking codes (admin-posted). Not tips guarantees.
-- Run after schema.sql + profiles.

create table if not exists public.bet_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text,
  note text,
  bookmaker text not null default 'msport',
  code_date date not null default (timezone('Africa/Lagos', now()))::date,
  active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bet_codes_date_active_idx
  on public.bet_codes (code_date desc, active, sort_order);

alter table public.bet_codes enable row level security;

drop policy if exists bet_codes_public_read on public.bet_codes;
create policy bet_codes_public_read on public.bet_codes
  for select using (active = true);

drop policy if exists bet_codes_admin_all on public.bet_codes;
create policy bet_codes_admin_all on public.bet_codes
  for all using (public.is_admin())
  with check (public.is_admin());

comment on table public.bet_codes is 'Public booking codes; entertainment only, not fixed or guaranteed outcomes';
