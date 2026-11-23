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
| 13 | `campaign_extras.sql` | Optional description + sample screenshot |
| 14 | `platform_settings.sql` | Admin-editable deposit wallets |
| 14 | `notifications.sql` | In-app notification bell + admin event alerts |

Also create a **Storage** bucket named `screenshots` (public read) for earn proofs.

Auth: **Confirm email = OFF**. Optional MFA for 2FA.

| 15 | `naira_drafts_poster.sql` | NGN package prices, drafts, poster confirm + disputes |
| 16 | `flutterwave.sql` | FLW payment columns |

| 17 | `payment_orders_unique.sql` | One order per campaign + idempotent approve |

| 18 | `packages_ngn.sql` | Naira package list & prices |

| 19 | `audit_cancel.sql` | Audit logs, cancel & delete orders |

| 20 | `sessions.sql` | Device sessions registry + revoke |

| 21 | `refill_campaign.sql` | Refill incomplete promotions |

| 22 | `withdrawals_bank.sql` | Bank withdrawals ₦1,000 min + FLW |

| 23 | `tax_compliance.sql` | VAT lines, invoice numbers, tax settings |
| 24 | `name_lock.sql` | Display name changes every 14 days; admin verify unlocks once |

## Additional migrations for the rebuilt deployment

Apply these after the numbered core migrations above:

| # | File | Purpose |
|---|------|---------|
| 25 | `packages_smallbiz.sql` | Reconciles active package tiers/prices with the current app and sets the task reward baseline to ₦50 |
| 27 | `security_hardening.sql` | Protects wallet balances, campaign approval/payment fields, submission reviews and payment-order mutations; run last |

| 28 | `username.sql` | Public @username handles (unique, 30-day change cooldown) |
