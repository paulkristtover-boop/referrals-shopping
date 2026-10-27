-- Track delivery progress on adverts (campaigns)
alter table public.campaigns
  add column if not exists referrals_delivered int not null default 0;

comment on column public.campaigns.referrals_delivered is 'How many referrals delivered so far toward package goal';
