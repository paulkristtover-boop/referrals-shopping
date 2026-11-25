-- Pause / resume active ads (Ads Manager style)
-- paused campaigns stay owned by user; tasks hidden from Earn until resumed.

create or replace function public.pause_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.campaigns
  set status = 'paused', updated_at = now()
  where id = p_campaign_id
    and user_id = auth.uid()
    and status = 'approved';
  if not found then
    -- admin may pause any
    if public.is_admin() then
      update public.campaigns set status = 'paused', updated_at = now()
      where id = p_campaign_id and status = 'approved';
      if not found then raise exception 'Only active (approved) ads can be paused'; end if;
    else
      raise exception 'Only active (approved) ads can be paused';
    end if;
  end if;
end;
$$;

create or replace function public.resume_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.campaigns
  set status = 'approved', updated_at = now()
  where id = p_campaign_id
    and user_id = auth.uid()
    and status = 'paused';
  if not found then
    if public.is_admin() then
      update public.campaigns set status = 'approved', updated_at = now()
      where id = p_campaign_id and status = 'paused';
      if not found then raise exception 'Only paused ads can be resumed'; end if;
    else
      raise exception 'Only paused ads can be resumed';
    end if;
  end if;
end;
$$;

grant execute on function public.pause_campaign(uuid) to authenticated;
grant execute on function public.resume_campaign(uuid) to authenticated;

-- Earn feed: only approved (not paused)
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select using (
  public.is_admin()
  or exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.status = 'approved'
  )
);

comment on function public.pause_campaign is 'User/admin: approved → paused (hide from Earn)';
comment on function public.resume_campaign is 'User/admin: paused → approved';
