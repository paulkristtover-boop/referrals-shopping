-- Naira display is app-side; amounts in DB are NGN (column still named price_usd historically).
-- Draft campaigns + poster confirms earn proofs; admin handles disputes.

alter table public.campaigns
  add column if not exists description text,
  add column if not exists sample_screenshot_url text;

-- Allow draft status (text column already free-form)
-- task_submissions: pending → awaiting_poster → approved | disputed → (admin) approved|rejected

alter table public.task_submissions
  add column if not exists poster_reviewed_at timestamptz,
  add column if not exists poster_note text,
  add column if not exists dispute_reason text,
  add column if not exists disputed_at timestamptz;

-- Poster sees submissions for their campaigns
drop policy if exists "subs_select" on public.task_submissions;
create policy "subs_select" on public.task_submissions for select using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (
    select 1 from public.tasks t
    join public.campaigns c on c.id = t.campaign_id
    where t.id = task_submissions.task_id and c.user_id = auth.uid()
  )
);

drop policy if exists "subs_update" on public.task_submissions;
create policy "subs_update" on public.task_submissions for update using (
  public.is_admin()
  or exists (
    select 1 from public.tasks t
    join public.campaigns c on c.id = t.campaign_id
    where t.id = task_submissions.task_id and c.user_id = auth.uid()
  )
);

-- Save draft (no payment)
create or replace function public.save_campaign_draft(
  p_title text,
  p_target_url text,
  p_package_id uuid,
  p_description text default null,
  p_sample_screenshot_url text default null,
  p_campaign_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_title is null or btrim(p_title) = '' then raise exception 'Title required'; end if;
  if p_target_url is null or btrim(p_target_url) = '' then raise exception 'URL required'; end if;

  if p_campaign_id is not null then
    update public.campaigns set
      title = btrim(p_title),
      target_url = btrim(p_target_url),
      package_id = p_package_id,
      description = nullif(btrim(p_description), ''),
      sample_screenshot_url = nullif(btrim(p_sample_screenshot_url), ''),
      status = 'draft'
    where id = p_campaign_id and user_id = uid and status = 'draft'
    returning id into cid;
    if cid is null then raise exception 'Draft not found'; end if;
    return cid;
  end if;

  insert into public.campaigns (
    user_id, package_id, title, target_url, description, sample_screenshot_url, status, paid_amount
  ) values (
    uid, p_package_id, btrim(p_title), btrim(p_target_url),
    nullif(btrim(p_description), ''), nullif(btrim(p_sample_screenshot_url), ''),
    'draft', 0
  ) returning id into cid;
  return cid;
end;
$$;

grant execute on function public.save_campaign_draft(text, text, uuid, text, text, uuid) to authenticated;

-- Poster approves earner proof → credit balance
create or replace function public.poster_approve_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  owner uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select s.*, t.reward_amount, c.user_id as owner_id
  into r
  from public.task_submissions s
  join public.tasks t on t.id = s.task_id
  join public.campaigns c on c.id = t.campaign_id
  where s.id = p_submission_id
  for update of s;

  if r is null then raise exception 'Submission not found'; end if;
  if r.owner_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the advert poster can confirm this proof';
  end if;
  if r.status not in ('pending', 'disputed') then
    raise exception 'Submission is not awaiting confirmation';
  end if;

  update public.task_submissions
  set status = 'approved',
      poster_reviewed_at = now(),
      reviewed_at = now()
  where id = p_submission_id;

  update public.profiles
  set balance = balance + r.reward_amount
  where id = r.user_id;
end;
$$;

grant execute on function public.poster_approve_submission(uuid) to authenticated;

-- Poster disputes → admin queue
create or replace function public.poster_dispute_submission(p_submission_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  st text;
begin
  select c.user_id, s.status into owner, st
  from public.task_submissions s
  join public.tasks t on t.id = s.task_id
  join public.campaigns c on c.id = t.campaign_id
  where s.id = p_submission_id;

  if owner is null then raise exception 'Not found'; end if;
  if owner <> auth.uid() and not public.is_admin() then
    raise exception 'Only the advert poster can dispute';
  end if;
  if st not in ('pending', 'disputed') then
    raise exception 'Cannot dispute this status';
  end if;

  update public.task_submissions
  set status = 'disputed',
      dispute_reason = nullif(btrim(p_reason), ''),
      disputed_at = now(),
      poster_reviewed_at = now()
  where id = p_submission_id;
end;
$$;

grant execute on function public.poster_dispute_submission(uuid, text) to authenticated;

-- Admin resolves dispute
create or replace function public.admin_resolve_dispute(
  p_submission_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  select s.*, t.reward_amount into r
  from public.task_submissions s
  join public.tasks t on t.id = s.task_id
  where s.id = p_submission_id
  for update of s;

  if r is null then raise exception 'Not found'; end if;
  if r.status <> 'disputed' and r.status <> 'pending' then
    raise exception 'Not in dispute queue';
  end if;

  if p_approve then
    update public.task_submissions
    set status = 'approved', reviewed_at = now(), poster_note = p_note
    where id = p_submission_id;
    if r.status <> 'approved' then
      update public.profiles set balance = balance + r.reward_amount where id = r.user_id;
    end if;
  else
    update public.task_submissions
    set status = 'rejected', reviewed_at = now(), poster_note = p_note
    where id = p_submission_id;
  end if;
end;
$$;

grant execute on function public.admin_resolve_dispute(uuid, boolean, text) to authenticated;

-- Update package seed prices to Naira (round packages)
update public.packages set price_usd = 25000 where name = 'Starter' and category = 'regular' and price_usd = 50;
update public.packages set price_usd = 50000 where name = 'Growth' and category = 'regular' and price_usd = 100;
update public.packages set price_usd = 100000 where name = 'Scale' and category = 'regular' and price_usd = 200;
update public.packages set price_usd = 50000 where name = 'Deposit Starter' and category = 'gambling' and price_usd = 100;
update public.packages set price_usd = 100000 where name = 'Deposit Growth' and category = 'gambling' and price_usd = 200;
update public.packages set price_usd = 200000 where name = 'Deposit Scale' and category = 'gambling' and price_usd = 400;
-- Free stays 0
