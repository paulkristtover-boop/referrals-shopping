# Referrals Shopping — setup

## Stack
- Vite + React 18 (Vercel, Node 24)
- Supabase Auth / DB / Storage
- API routes under `/api/payments` (quote + check)

## Deploy
1. Connect GitHub repo to Vercel
2. Set env vars from `.env.example`
3. Build: `npm run build` (Vite)

## Database
Run SQL files in order listed in `supabase/README.md`.

Minimum for payments:
- `schema.sql`, `fix_rls.sql`, `features.sql`, `payments_unique.sql`
- `platform_settings.sql` then set wallets in **Admin → Settings**

## Storage
Create public bucket `screenshots` for earn proofs.

## Auth
Disable email confirmation. Optional MFA (Security page).

## Product rules
- **Regular packages**: referred user signs up only
- **Gambling packages**: signup + deposit
- Free Starter: 50 regular referrals, once per account


## Flutterwave webhooks
Dashboard webhook URL:
`https://YOUR_VERCEL_DOMAIN/api/payments/flutterwave-webhook`

Health check (must return 200):
`https://YOUR_VERCEL_DOMAIN/api/payments/flutterwave-health`

Env: `FLW_SECRET_KEY`, `FLW_SECRET_HASH` (same as dashboard secret hash), `APP_URL`
