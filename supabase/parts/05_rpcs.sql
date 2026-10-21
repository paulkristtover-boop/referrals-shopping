-- PART 5/5: Admin RPC functions
-- Paste and Run after part 4 succeeds

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
  v_reward := greatest(0.05, least(0.50, (v_package.price_usd / v_package.referrals_count) * 0.5));

  update public.campaigns
  set status = 'approved',
      paid_amount = coalesce(paid_amount, v_package.price_usd),
      updated_at = now()
  where id = p_campaign_id;

  insert into public.tasks (
    campaign_id, required_wait_seconds, reward_amount, status, max_completions, current_completions
  ) values (
    p_campaign_id, 30, round(v_reward, 2), 'active', v_package.referrals_count, 0
  );
end;
$$;

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
  set status = 'rejected', admin_notes = p_notes, updated_at = now()
  where id = p_campaign_id
    and status in ('pending_approval', 'pending_payment');
end;
$$;

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
  if not found then raise exception 'Submission not found'; end if;
  if v_sub.status <> 'pending' then raise exception 'Submission already reviewed'; end if;

  select * into v_task from public.tasks where id = v_sub.task_id for update;

  update public.task_submissions
  set status = 'approved', earned_amount = v_task.reward_amount,
      reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_submission_id;

  update public.profiles
  set balance = balance + v_task.reward_amount, updated_at = now()
  where id = v_sub.user_id;

  insert into public.transactions (user_id, type, amount, currency, status, reference_id, notes)
  values (v_sub.user_id, 'earning', v_task.reward_amount, 'USD', 'completed',
          p_submission_id, 'Task completion reward');

  update public.tasks
  set current_completions = current_completions + 1,
      status = case
        when max_completions is not null and current_completions + 1 >= max_completions
        then 'completed' else status end
  where id = v_sub.task_id;
end;
$$;

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
  set status = 'rejected', admin_notes = p_notes,
      reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_submission_id and status = 'pending';
end;
$$;

grant execute on function public.admin_approve_campaign(uuid) to authenticated;
grant execute on function public.admin_reject_campaign(uuid, text) to authenticated;
grant execute on function public.admin_approve_submission(uuid) to authenticated;
grant execute on function public.admin_reject_submission(uuid, text) to authenticated;
