-- Free Starter: 50 regular referrals, once per account
-- Run in Supabase SQL Editor

alter table public.profiles
  add column if not exists free_starter_used_at timestamptz;

insert into public.packages (name, category, referrals, price_usd, active)
select 'Free Starter (50 referrals)', 'regular', 50, 0, true
where not exists (
  select 1 from public.packages
  where price_usd = 0 and referrals = 50 and category = 'regular'
);

-- Claim free starter (one per user). Returns campaign id or raises.
create or replace function public.claim_free_starter(
  p_title text,
  p_target_url text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pkg_id uuid;
  camp_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.profiles
    where id = uid and free_starter_used_at is not null
  ) then
    raise exception 'Free Starter already used on this account';
  end if;

  -- Admins should not claim product freebies
  if public.is_admin() then
    raise exception 'Admins cannot claim Free Starter';
  end if;

  select id into pkg_id
  from public.packages
  where active = true and price_usd = 0 and category = 'regular' and referrals = 50
  order by price_usd, name
  limit 1;

  if pkg_id is null then
    raise exception 'Free Starter package not found';
  end if;

  insert into public.campaigns (
    user_id, package_id, title, target_url, status, paid_amount, crypto_chain, payment_note, approved_at
  ) values (
    uid, pkg_id, p_title, p_target_url, 'approved', 0, null, 'free_starter', now()
  )
  returning id into camp_id;

  insert into public.tasks (campaign_id, reward_amount, wait_seconds, active)
  values (camp_id, 0.05, 15, true);

  update public.profiles
  set free_starter_used_at = now()
  where id = uid;

  return camp_id;
end;
$$;

grant execute on function public.claim_free_starter(text, text) to authenticated;
