# Tax compliance support (Referrals Shopping)

This product includes **tax-ready invoicing**, not automatic global tax registration.

## What the software does
- Configurable VAT/GST-style rate (default **7.5% Nigeria VAT**, tax-inclusive prices)
- Net / tax / total on **Receipts** and printed tax invoices
- Supplier name, address, tax ID on invoices
- Optional customer tax ID / billing name on Account
- Invoice numbers (`RS-INV-YYYY-######`) after `apply_order_tax`
- Snapshots tax on paid orders (Flutterwave verify/webhook)

## What you must still do
- Register with tax authorities where you have a permanent establishment or digital VAT/GST obligations
- Collect and remit VAT/GST/sales tax per local rules
- File returns on time; keep export of receipts for audits
- For multi-country expansion: map rates by customer country (OSS/IOSS, state sales tax, etc.) — not fully automated here
- Crypto payouts may have separate reporting rules

## SQL
Run: `supabase/tax_compliance.sql`

## Admin
**Settings → Tax compliance** — rate, supplier, tax ID.

## Disclaimer
Not legal or tax advice. Engage a qualified adviser for Nigeria and any other market you serve.
