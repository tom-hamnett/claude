# Going live — FLUX as a shared web app (any device, your whole team)

This gets FLUX onto a URL your team opens from any laptop, tablet or phone, with
sign-in and shared data. Total time: **~15 minutes**, all point-and-click.

You'll set up two free services: **Supabase** (the shared database + sign-in) and
**Vercel** (hosts the web app). Both have free tiers that are plenty for a team.

---

## Step 1 — Create the database (Supabase) · ~5 min

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub.
2. **New project**. Give it a name (e.g. `flux`), pick a region near you, set a database password (save it somewhere), **Create**.
3. Wait ~2 min for it to provision.
4. In the left sidebar: **SQL Editor** → **New query**.
5. Open the file `flux/supabase/schema.sql` from this repo, copy **all** of it, paste into the editor, click **Run**. You should see "Success".
6. In the left sidebar: **Project Settings → API**. Copy these two values — you'll need them next:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

### One email setting
By default Supabase sends sign-in codes via its own mailer (fine for a small team). For higher volume, **Authentication → Providers → Email** is already on; you can later plug in your own SMTP. Nothing to change for now.

---

## Step 2 — Deploy the app (Vercel) · ~5 min

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub.
2. **Add New… → Project** → import your `claude` repository.
3. **Important — set the root directory:** click **Edit** next to "Root Directory" and choose **`flux`**. (The app lives in that subfolder.)
4. Framework preset should auto-detect **Vite**. Leave build settings as default.
5. Expand **Environment Variables** and add the two from Step 1:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
6. Click **Deploy**. After ~1 minute you get a live URL like `https://flux-xxxx.vercel.app`.

> Prefer Netlify? Same idea: New site → pick the repo → set **base directory** to `flux`, build `npm run build`, publish `flux/dist`, add the same two env vars. (`netlify.toml` is already in the folder.)

---

## Step 3 — Sign in, then VERIFY ISOLATION · ~5 min

1. Open the URL. You'll see the FLUX sign-in screen.
2. Enter your work email (e.g. `you@v2ogroup.com`). Click **Send code**, check your inbox, enter the 6-digit code.
3. Each person adds their **own AI key** in **Settings** (it stays on their device).

**Projects are private.** A project is visible only to its creator and the people they invite (**Share** button on the project), all within your email domain. Others can create their own separate projects. Everyone on a project sees its sub-processes and the aggregate findings.

> ⚠️ **Before you trust real client data to it, verify the isolation** (the security lives in database row-level-security that must be confirmed in your environment):
> 1. As **user A**, create a project "Isolation test".
> 2. As **user B** (same domain, *not* invited), confirm B **cannot** see it.
> 3. As A, **Share** it to B; confirm B can now see it; remove B and confirm it disappears.
> If anything leaks, stop and tell me — don't load real data until this passes.

4. Want the demo back? **Settings → Load demo engagement** (private to you).

That's it — bookmark the URL on your phone's home screen and it behaves like an app.

---

## How it's wired (for reference)

- **No env vars set →** FLUX runs in local-only mode (data in that browser). This is the default if you just `npm run dev` without a `.env.local`.
- **Env vars set →** cloud mode: email one-time-code sign-in, data in Postgres, scoped per email-domain workspace by row-level security, syncing live across devices via Supabase realtime.
- **AI keys are never stored in the cloud** — only in each user's browser. The database holds engagements, processes, opportunities and knowledge; nothing else.

## Restricting who can join

Right now anyone who can sign in with an email on your domain joins your workspace; people on *other* domains get their own separate workspace (they can't see yours). If you want to hard-restrict sign-ups to specific domains, set an allowlist in **Supabase → Authentication → Sign In / Providers** (or tell me and I'll add a domain check to the `handle_new_user` trigger).

## Updating the app later

Any push to the repo redeploys automatically on Vercel/Netlify. If I change the
database shape I'll give you a short migration to paste into the SQL Editor.
