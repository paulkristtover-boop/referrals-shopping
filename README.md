# Referral Shopping (React + Vercel)

**Website** built with React (Vite). Deploy on Vercel → open `https://your-project.vercel.app`.

## Stack

- React 18 + React Router + Bootstrap
- Supabase (auth, database, screenshot storage)
- Vercel static hosting (Node 24)

## Setup

1. **Supabase** → SQL Editor → run `supabase/schema.sql`  
2. Create Storage bucket **`screenshots`** (public)  
3. Copy project URL + anon key
4. Run the feature migrations in `supabase/README.md`, including `packages_smallbiz.sql` for the current sustainable NGN pricing.

  

5. **Vercel** env variables:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DEPOSIT_TRX=
VITE_DEPOSIT_SOL=
VITE_DEPOSIT_TON=
```

6. Node.js version on Vercel: **24.x**

7. Make admin after register:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

## Local

```bash
npm install
cp .env.example .env
# fill .env
npm run dev
```

## Deploy

Vercel detects Vite from `package.json`, installs the project dependencies, runs `npm run build`, and serves the `dist` folder. If detection is not automatic, select **Vite** as the Framework Preset, use `npm run build` as the Build Command, and `dist` as the Output Directory. Keep `package.json` (and preferably a committed `package-lock.json`) in the repository root.

```bash
git add -A
git commit -m "React website for Vercel"
git push
```

Link the GitHub repo to Vercel (Framework: Vite). Production URL: `*.vercel.app`.

## Disable email confirmation (required for instant login)

Supabase Dashboard → **Authentication** → **Providers** → **Email**:

- Turn **OFF** “Confirm email”
- Save

Without this, new users cannot sign in until they click a confirmation email.

## Admin CMS

After you are registered:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

Open **/admin** for campaigns, proofs, payouts, packages, and users.

## Payments (no Vercel Cron)

Hobby plan has no per-minute cron. Detection runs in the browser:

- Auto-check every ~12 seconds while the 15-minute window is open
- Manual **Check now** button
- Server endpoint: `GET /api/payments/check?orderId=...`

Still set `SUPABASE_SERVICE_ROLE_KEY` and deposit/API keys for the check API.
