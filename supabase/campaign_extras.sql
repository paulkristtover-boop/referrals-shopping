-- Optional description + sample screenshot on campaigns (promote orders)
alter table public.campaigns
  add column if not exists description text,
  add column if not exists sample_screenshot_url text;

-- Extend free starter claim if it only takes title/url
create or replace function public.claim_free_starter(
  p_title text,
  p_target_url text,
  p_description text default null,
  p_sample_screenshot_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pkg_id uuid;
  camp_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and free_starter_used_at is not null) then
    raise exception 'Free Starter already used';
  end if;

  select id into pkg_id from public.packages
  where active = true and price_usd = 0 and category = 'regular'
  order by referrals asc limit 1;

  if pkg_id is null then
    raise exception 'Free Starter package not available';
  end if;

  perform set_config('rs.internal_campaign_update','on',true);
  insert into public.campaigns (
    user_id, package_id, title, target_url, description, sample_screenshot_url,
    status, paid_amount, approved_at
  ) values (
    uid, pkg_id, p_title, p_target_url, nullif(btrim(p_description), ''),
    nullif(btrim(p_sample_screenshot_url), ''),
    'approved', 0, now()
  ) returning id into camp_id;

  insert into public.tasks (campaign_id, reward_amount, wait_seconds, active)
  values (camp_id, 15, 15, true);

  perform set_config('rs.internal_profile_update','on',true);
  update public.profiles set free_starter_used_at = now() where id = uid;

  return camp_id;
end;
$$;

grant execute on function public.claim_free_starter(text, text, text, text) to authenticated;
