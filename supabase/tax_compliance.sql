-- Tax compliance support: snapshot tax on orders + platform tax settings
-- Does not replace registration with tax authorities.

alter table public.campaigns
  add column if not exists tax_rate numeric(8,4) default 0,
  add column if not exists tax_amount numeric(14,2) default 0,
  add column if not exists net_amount numeric(14,2) default 0,
  add column if not exists tax_mode text default 'inclusive',
  add column if not exists tax_region text default 'NG',
  add column if not exists invoice_number text;

alter table public.profiles
  add column if not exists tax_id text,
  add column if not exists billing_name text,
  add column if not exists billing_country text default 'NG';

-- Invoice sequence
create sequence if not exists public.invoice_seq start 10001;

create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'RS-INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0');
end;
$$;

grant execute on function public.next_invoice_number() to authenticated;

-- Apply tax snapshot when marking paid / pending_approval
create or replace function public.apply_order_tax(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  rate numeric := 7.5;
  mode text := 'inclusive';
  region text := 'NG';
  enabled text := 'true';
  gross numeric;
  net numeric;
  tax numeric;
  inv text;
begin
  select * into c from public.campaigns where id = p_campaign_id for update;
  if c is null then raise exception 'Order not found'; end if;

  select value into enabled from public.platform_settings where key = 'tax_enabled' limit 1;
  select nullif(value, '')::numeric into rate from public.platform_settings where key = 'tax_rate_percent' limit 1;
  select value into mode from public.platform_settings where key = 'tax_mode' limit 1;
  select value into region from public.platform_settings where key = 'tax_region' limit 1;

  if coalesce(enabled, 'true') in ('false', '0', 'no') then
    rate := 0;
    mode := 'none';
  end if;

  gross := coalesce(c.paid_amount, 0);
  if coalesce(rate, 0) <= 0 or mode = 'none' then
    net := gross;
    tax := 0;
    rate := 0;
  else
    net := round(gross / (1 + (rate / 100.0)), 2);
    tax := round(gross - net, 2);
  end if;

  if c.invoice_number is null then
    inv := public.next_invoice_number();
  else
    inv := c.invoice_number;
  end if;

  perform set_config('rs.internal_campaign_update','on',true);
  update public.campaigns set
    tax_rate = coalesce(rate, 0),
    tax_amount = tax,
    net_amount = net,
    tax_mode = coalesce(mode, 'inclusive'),
    tax_region = coalesce(region, 'NG'),
    invoice_number = inv
  where id = p_campaign_id;
end;
$$;

grant execute on function public.apply_order_tax(uuid) to authenticated;

-- Default platform tax keys (admin can override via settings)
insert into public.platform_settings (key, value) values
  ('tax_enabled', 'true'),
  ('tax_rate_percent', '7.5'),
  ('tax_mode', 'inclusive'),
  ('tax_region', 'NG'),
  ('tax_currency', 'NGN'),
  ('tax_supplier_name', 'Referrals Shopping'),
  ('tax_supplier_address', ''),
  ('tax_id_label', 'Tax ID / VAT No.'),
  ('tax_id', ''),
  ('tax_invoice_footer', 'This is a payment receipt. Tax obligations depend on applicable law. Seek professional advice.')
on conflict (key) do nothing;
