# Referrals Shopping — simple guide

This is a **website** (not a Telegram bot).

People can:

1. **Promote** — pay with crypto (TRX / SOL / TON), submit their link, get real people to click it  
2. **Earn** — do small tasks (open a link, wait a few seconds, upload a screenshot), get paid, withdraw  

Admin approves payments and task proofs.

---

## Pages (what you see)

| URL | Who | What it does |
|-----|-----|----------------|
| `/` | Everyone | Home — explain product + package prices |
| `/login` `/register` | Everyone | Create account / sign in |
| `/terms` | Everyone | Terms |
| `/dashboard` | Logged in | Overview: balance, your campaigns, recent tasks |
| `/promote` | Logged in | Choose package → paste link → pay crypto → mark “I paid” |
| `/earn` | Logged in | List of tasks → wait timer → upload screenshot |
| `/wallet` | Logged in | Balance + request withdrawal |
| `/admin` | Admin only | Approve campaigns, submissions, withdrawals |

---

## User flow (plain English)

### Promote
1. Register → accept terms  
2. Open **Promote**  
3. Pick a package (e.g. 1000 referrals for $50)  
4. Paste the link you want people to visit  
5. Send crypto to the shown address  
6. Click **I have paid**  
7. Admin checks payment → approves → tasks go live for earners  

### Earn
1. Register  
2. Open **Earn**  
3. Pick a task → open the link → wait the timer  
4. Take a screenshot → upload  
5. Admin approves → money is added to your balance  
6. **Wallet** → request withdrawal  

---

## Tech (for you / Vercel)

- Next.js 15 + Bootstrap (light/dark theme)  
- Supabase = database + login + screenshot storage  
- Deploy on Vercel  

### One-time setup

1. Supabase project → run `supabase/schema.sql` in SQL Editor  
2. Copy URL + anon key into Vercel env (or `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEPOSIT_TRX=
NEXT_PUBLIC_DEPOSIT_SOL=
NEXT_PUBLIC_DEPOSIT_TON=
```

3. Make yourself admin:

```sql
update public.profiles set role = 'admin' where email = 'your@email.com';
```

4. Vercel → Project Settings → **Node.js Version = 20.x** (required)

5. Push code → site goes live  

---

## Folder map

```
src/app/          ← pages (what users open)
  page.tsx        ← home
  login/ register/
  dashboard/ promote/ earn/ wallet/ admin/
src/components/   ← Navbar, Footer
src/lib/          ← Supabase + types
supabase/         ← database SQL
```

---

## Local (optional)

```bash
npm install
cp .env.example .env.local   # fill keys
npm run dev
```

Open http://localhost:3000
