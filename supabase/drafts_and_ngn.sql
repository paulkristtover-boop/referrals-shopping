-- Draft campaigns + note that price_usd stores NGN amounts in the product UI
-- Status: draft → pending_payment → …

-- No schema change required for currency column name; app displays NGN.

comment on column public.packages.price_usd is 'Package price in NGN (Naira), column name historical';
comment on column public.profiles.balance is 'User wallet balance in NGN';
