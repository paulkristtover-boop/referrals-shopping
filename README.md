# Referrals Shopping

Full-stack referral promotion & earning platform.

- **Promote**: Buy packages (TRX / SOL / TON) → submit link → mark paid → admin approves → tasks created
- **Earn**: Complete tasks (visit + wait + screenshot upload) → admin reviews → get paid → withdraw

## Stack

- Next.js 15 (App Router)
- React Bootstrap 5 + Bootstrap Icons
- Light / Dark theme toggle
- Supabase (Auth, Postgres, Storage, RLS, RPC)
- Vercel ready

## Quick Start

1. **Install**
   ```bash
   cd referrals-shopping
   npm install
   ```

2. **Supabase project**
   - Create project at https://supabase.com
   - Copy URL + anon key into `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=...
     NEXT_PUBLIC_SUPABASE_ANON_KEY=...
     NEXT_PUBLIC_DEPOSIT_TRX=TYourAddress
     NEXT_PUBLIC_DEPOSIT_SOL=YourSOLAddress
     NEXT_PUBLIC_DEPOSIT_TON=EQYourTONAddress
     ```

3. **Run schema**
   - Supabase → SQL Editor → paste **entire** `supabase/schema.sql` → Run
   - This creates tables, RLS, seed packages, storage policies, and admin RPCs

4. **Storage**
   - The schema tries to create bucket `screenshots`. If it fails, create it manually in Storage (public).

5. **Start**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

6. **Become admin**
   ```sql
   update public.profiles set role = 'admin' where email = 'your@email.com';
   ```

## Features implemented

| Feature | Status |
|---------|--------|
| Auth (login / register + terms) | ✅ |
| Middleware (protect routes, admin-only `/admin`) | ✅ |
| Theme toggle | ✅ |
| Dashboard (live balance, campaigns, submissions) | ✅ |
| Promote (packages from DB → create campaign → payment UI → mark paid) | ✅ |
| Earn (live tasks → timer → screenshot upload to Storage → submit) | ✅ |
| Admin (approve/reject campaigns via RPC → creates tasks; approve submissions → credits balance) | ✅ |
| Wallet (balance, withdraw request, history) | ✅ |
| Crypto deposit addresses (env-configurable) | ✅ |

## Payment flow (MVP)

1. User selects package + enters link → campaign created (`pending_payment`)
2. User sees platform deposit address + reference → sends TRX/SOL/TON
3. User clicks **I have paid** → status becomes `pending_approval`
4. Admin verifies on-chain transfer → clicks **Approve**
5. RPC `admin_approve_campaign` sets status `approved` and inserts a `tasks` row with reward + max_completions = package referrals count
6. Earn users see the task, complete it, upload screenshot
7. Admin approves submission → user balance credited via `admin_approve_submission`

## Project structure

```
src/
  middleware.ts          # Auth + admin protection
  app/
    (auth)/login, register
    dashboard, promote, earn, wallet, admin, terms
  components/            Navbar (auth-aware), Footer
  contexts/              ThemeContext
  lib/
    types.ts
    config.ts            # Deposit addresses
    supabase/            client, server, middleware helpers
supabase/
  schema.sql             # Full schema + RPCs + storage
```

## Next optional improvements

- On-chain payment listeners (TRON / Solana / TON APIs)
- Email notifications on approval
- Rate limits / anti-fraud for tasks
- Payout fee / minimum withdrawal
