# Referrals Shopping — database setup

Run in **Supabase → SQL Editor** in this order (skip any already applied):

| # | File | Purpose |
|---|------|---------|
| 1 | `schema.sql` | Core tables, packages seed, basic RPCs |
| 2 | `fix_rls.sql` | RLS helpers (`is_admin`) |
| 3 | `features.sql` | Invites, support tickets, payment_orders |
| 4 | `payments_unique.sql` | Unique crypto amounts / expiry |
| 5 | `freemium.sql` | Free Starter package + claim RPC |
| 6 | `account_id.sql` | Human Account ID `RS-#####` |
| 7 | `advert_progress.sql` | `referrals_delivered` |
| 8 | `campaign_lifecycle.sql` | Status machine + complete when filled |
| 9 | `earn_integrity.sql` | Task timer, no self-earn, one proof |
| 10 | `withdrawals_safe.sql` | Safe withdraw / refund |
| 11 | `invites_admin.sql` | Invite counts + admin UUID tokens |
| 12 | `public_stats.sql` | Optional homepage stats (optional) |
| 13 | `campaign_extras.sql` | Optional description + sample screenshot |
| 14 | `platform_settings.sql` | Admin-editable deposit wallets |
| 14 | `notifications.sql` | Optional (feature removed from UI) |

Also create a **Storage** bucket named `screenshots` (public read) for earn proofs.

Auth: **Confirm email = OFF**. Optional MFA for 2FA.

| 15 | `naira_drafts_poster.sql` | NGN package prices, drafts, poster confirm + disputes |
| 16 | `flutterwave.sql` | FLW payment columns |

| 17 | `payment_orders_unique.sql` | One order per campaign + idempotent approve |

| 18 | `packages_ngn.sql` | Naira package list & prices |

| 19 | `audit_cancel.sql` | Audit logs, cancel & delete orders |

| 20 | `sessions.sql` | Device sessions registry + revoke |
