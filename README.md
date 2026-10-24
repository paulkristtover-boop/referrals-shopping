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

4. **Vercel** env variables:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DEPOSIT_TRX=
VITE_DEPOSIT_SOL=
VITE_DEPOSIT_TON=
```

5. Node.js version on Vercel: **24.x**

6. Make admin after register:

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
