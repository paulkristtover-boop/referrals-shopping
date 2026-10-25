-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info','success','warning','payment','support','system')),
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notif_select" on public.notifications;
drop policy if exists "notif_update" on public.notifications;
drop policy if exists "notif_insert" on public.notifications;

create policy "notif_select" on public.notifications
  for select using (auth.uid() = user_id or public.is_admin());

create policy "notif_update" on public.notifications
  for update using (auth.uid() = user_id);

-- Users cannot insert for others; admins/service role can
create policy "notif_insert_admin" on public.notifications
  for insert with check (public.is_admin() or auth.uid() = user_id);

-- Helper for app / service role
create or replace function public.notify_user(
  p_user_id uuid,
  p_title text,
  p_body text default null,
  p_type text default 'info',
  p_link text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  insert into public.notifications (user_id, title, body, type, link)
  values (p_user_id, p_title, p_body, coalesce(p_type, 'info'), p_link)
  returning id into nid;
  return nid;
end;
$$;
