# Use JobPilot on your laptop and phone (cloud sync)

Without this setup, each device keeps its own data. With it, you sign in with the
same email on both and see the same resume, jobs and applications everywhere.
It uses Supabase's free plan. Setup takes about 5 minutes.

## 1. Create the Supabase project

1. Go to https://supabase.com and sign up (GitHub sign-in works).
2. Click **New project**. Name it `jobpilot`, set a database password (save it
   somewhere), pick the region **Mumbai** (closest to Bengaluru), and create it.

## 2. Create the sync table

1. In the project, open **SQL Editor** → **New query**.
2. Paste everything from [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   You should see "Success. No rows returned".

## 3. Copy two keys

Open **Project Settings** → **API** (or **Data API**) and copy:

- **Project URL** (looks like `https://abcd1234.supabase.co`)
- **anon public** key (a long string starting with `eyJ`)

The anon key is safe in a website. Row-level security (set up in step 2) means
each person can only read their own data. Never paste the `service_role` key anywhere.

## 4. Add them to Vercel

1. Open your project on https://vercel.com → **Settings** → **Environment Variables**.
2. Add `VITE_SUPABASE_URL` = the Project URL.
3. Add `VITE_SUPABASE_ANON_KEY` = the anon public key.
4. Go to **Deployments**, open the latest one, and click **Redeploy**.
   Vite reads these at build time, so they only apply after a redeploy.

## 5. Set the sign-in redirect

In Supabase, open **Authentication** → **URL Configuration** and set **Site URL** to
your Vercel address (for example `https://ai-job-application-agent-pi.vercel.app`).
The confirmation email links back there.

## 6. Use it

1. On your laptop, open the app → **Sign up** with your email and a password.
2. Click the link in the confirmation email, then sign in.
   Any resume and jobs already on that laptop are uploaded on first sign-in.
3. On your phone, open the same address and sign in with the same email.
4. Install it: on Android, Chrome ⋮ menu → **Install app**. On iPhone, Safari → Share → **Add to Home Screen**.

**Settings → Phone & Sync** shows the sync status and has a **Sync now** button.
The app syncs when you open it, every 2 minutes while it's open, and a few
seconds after any change.

## How it behaves

- It works offline. Changes sync when you're back online.
- If you change the same job on both devices, the most recent change wins.
- Deleting a job or application on one device deletes it on the other.
- Signing out uploads pending changes, then clears that device's copy.
