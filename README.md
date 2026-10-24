# Referrals Shopping (PHP website)

Normal **website** — open in the browser. No Node.js, no Vercel build.

## What it does

- **Promote** — buy package, paste link, pay TRX/SOL/TON, mark paid  
- **Earn** — open link, wait timer, upload screenshot  
- **Wallet** — balance & withdraw  
- **Admin** — approve campaigns, proofs, withdrawals  

## Requirements

- PHP 8.0+ (with PDO MySQL)
- MySQL or MariaDB
- Apache/Nginx (or `php -S` for local test)

## Setup

1. Create database and import schema:

```bash
mysql -u root -p < sql/schema.sql
```

2. Edit `includes/config.php`:

- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `DEPOSIT_TRX`, `DEPOSIT_SOL`, `DEPOSIT_TON`
- `BASE_URL` if site is in a subfolder (e.g. `/referrals-shopping-php`)

3. Make uploads writable:

```bash
chmod -R 775 uploads
```

4. Make yourself admin (after registering):

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

5. Run locally:

```bash
cd referrals-shopping-php
php -S localhost:8080
```

Open http://localhost:8080

## Host online

Upload the folder to any PHP host (cPanel, Namecheap, Hostinger, etc.), point domain to the folder, set MySQL in config.  
Later buy your own domain and point it to the same host.

## Pages

| File | Purpose |
|------|---------|
| index.php | Home |
| guide.php | How it works |
| register.php / login.php | Account |
| dashboard.php | Overview |
| promote.php | Buy & pay |
| earn.php | Tasks + screenshot |
| wallet.php | Withdraw |
| admin.php | Approvals |
