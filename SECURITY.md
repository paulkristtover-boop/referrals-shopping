# Security structure — Referrals Shopping

## Secrets (server only)
| Variable | Used by |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | API admin client |
| `FLW_SECRET_KEY` | Flutterwave charge / verify |
| `FLW_SECRET_HASH` | Webhook `verif-hash` |
| `DEPOSIT_*` | Crypto deposit addresses (or Admin Settings) |

Never prefix secrets with `VITE_`.

## Payments
1. **Flutterwave**: init → hosted checkout → **server verify** (+ webhook re-verify).
2. **Crypto**: unique amount, 15 min window, chain check API.
3. Browser success alone never credits an order.

## Auth & roles
- Supabase Auth (email confirm off; optional TOTP on `/security`).
- `profiles.role`: `user` | `admin`.
- RLS via `is_admin()`; posters only confirm proofs on **their** campaigns.

## Money
- Withdrawals: balance locked on request; refund on reject (`withdrawals_safe.sql`).
- Earn: poster approve or admin dispute resolve; approve is idempotent.

## Headers
Vercel sets `X-Frame-Options`, CSP (allows Flutterwave checkout + Supabase), `nosniff`.

## SQL order
See `supabase/README.md`. Critical: `fix_rls.sql`, `naira_drafts_poster.sql`, `payment_orders_unique.sql`.
