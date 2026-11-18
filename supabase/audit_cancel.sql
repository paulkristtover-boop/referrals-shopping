-- Audit log + cancel/delete campaign orders

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity, entity_id);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_select_own_or_admin" on public.audit_logs;
create policy "audit_select_own_or_admin" on public.audit_logs
  for select using (auth.uid() = actor_id or public.is_admin());

drop policy if exists "audit_insert_auth" on public.audit_logs;
create policy "audit_insert_auth" on public.audit_logs
  for insert with check (auth.uid() = actor_id or public.is_admin());

create or replace function public.write_audit(
  p_action text,
  p_entity text,
  p_entity_id text default null,
  p_meta jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  lid uuid;
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_meta, '{}'::jsonb))
  returning id into lid;
  return lid;
end;
$$;

grant execute on function public.write_audit(text, text, text, jsonb) to authenticated;

-- Cancel own order (draft / pending_payment only)
create or replace function public.cancel_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into c from public.campaigns where id = p_campaign_id for update;
  if c is null then raise exception 'Order not found'; end if;
  if c.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if c.status not in ('draft', 'pending_payment') then
    raise exception 'Only drafts or unpaid orders can be cancelled';
  end if;

  perform set_config('rs.internal_campaign_update','on',true);
  update public.campaigns set status = 'cancelled' where id = p_campaign_id;
  update public.payment_orders set status = 'cancelled' where campaign_id = p_campaign_id and status = 'awaiting_payment';

  insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), 'campaign.cancelled', 'campaign', p_campaign_id::text, jsonb_build_object('prev', c.status));
end;
$$;

grant execute on function public.cancel_campaign(uuid) to authenticated;

-- Delete draft or cancelled only
create or replace function public.delete_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into c from public.campaigns where id = p_campaign_id for update;
  if c is null then raise exception 'Order not found'; end if;
  if c.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if c.status not in ('draft', 'cancelled') then
    raise exception 'Only drafts or cancelled orders can be deleted';
  end if;

  delete from public.payment_orders where campaign_id = p_campaign_id;
  delete from public.campaigns where id = p_campaign_id;

  insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), 'campaign.deleted', 'campaign', p_campaign_id::text, jsonb_build_object('title', c.title));
end;
$$;

grant execute on function public.delete_campaign(uuid) to authenticated;
