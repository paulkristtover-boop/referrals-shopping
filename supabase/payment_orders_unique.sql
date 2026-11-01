-- One payment order row per campaign (idempotent Flutterwave / crypto)
create unique index if not exists payment_orders_campaign_id_uidx
  on public.payment_orders (campaign_id)
  where campaign_id is not null;

-- Prevent double-credit on approve submission
create or replace function public.admin_approve_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select s.*, t.reward_amount into r
  from public.task_submissions s
  join public.tasks t on t.id = s.task_id
  where s.id = p_submission_id
  for update of s;

  if r is null then raise exception 'Submission not found'; end if;
  if r.status = 'approved' then
    return; -- idempotent
  end if;
  if r.status not in ('pending', 'disputed') then
    raise exception 'Cannot approve status %', r.status;
  end if;

  update public.task_submissions
  set status = 'approved', reviewed_at = now()
  where id = p_submission_id;

  update public.profiles
  set balance = balance + r.reward_amount
  where id = r.user_id;
end;
$$;

grant execute on function public.admin_approve_submission(uuid) to authenticated;
