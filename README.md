# Cipher Case — Login + Answer Submission Site

A 2-page static site: a login/signup page and a protected "who is the
killer" answer page, styled to match your poster. Backed by Supabase for
auth and storage.

## What's in here

| File                  | Purpose                                              |
|------------------------|-------------------------------------------------------|
| `index.html` / `auth.js` | Login + signup page (email/password, show/hide, cooldown) |
| `case.html` / `case.js`  | Suspect lineup, reasoning box, star rating, one-time submit |
| `style.css`             | Shared noir/case-file theme                          |
| `supabase-client.js`    | Shared Supabase client setup                          |
| `config.js`             | **Edit this** — your Supabase keys + suspect list      |
| `supabase-setup.sql`    | Run this once in Supabase to create everything server-side |

## Setup (about 10 minutes)

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New project. Free tier is enough.

### 2. Run the SQL
Dashboard → **SQL Editor** → New query → paste the entire contents of
`supabase-setup.sql` → Run. This creates:
- A `login_attempts` table + functions that lock an email out for 5 minutes after 3 failed logins.
- A `submissions` table where each user can have **exactly one row** (enforced by the primary key, not just app logic) with Row Level Security so users can only ever see/insert their own row.

### 3. Turn on email confirmation
Dashboard → **Authentication → Sign In / Providers → Email** → enable
"Confirm email". This stops someone from registering with a typo'd or
someone-else's address without proving they own the inbox.

### 4. (Recommended) Turn on bot protection
Dashboard → **Authentication → Attack Protection** → enable the CAPTCHA
option (hCaptcha/Turnstile). This adds another layer against scripted
brute-force/signup abuse on top of the built-in cooldown.

### 5. Get your keys
Dashboard → **Project Settings → API** → copy the **Project URL** and the
**anon public** key (NOT the `service_role` key — never put that in
client code).

Paste them into `config.js`:
```js
window.SUPABASE_URL = "https://xxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...";
```

### 6. Set your suspects
Still in `config.js`, edit the `SUSPECTS` array to your actual case's
suspect names — these are what participants pick from.

### 7. Deploy
This is a plain static site — no build step. Easiest options:
- **Netlify / Vercel**: drag-and-drop the folder, or connect a GitHub repo.
- **GitHub Pages**: push the folder to a repo, enable Pages.

Any static host works since everything talks to Supabase directly over
HTTPS from the browser.

## How the security requirements are met

1. **Open to any email** — anyone can register with any valid email
   address (VIT students and outside participants alike). Basic format
   is checked in the browser before it's sent to Supabase.
2. **Password masked with show/hide** — plain `type="password"` toggled
   to `type="text"`, nothing sent anywhere differently either way.
3. **Supabase for accounts + answers** — `auth.users` for accounts,
   `public.submissions` for answers.
4. **"Completely safe"** — no secret keys in the frontend (only the
   public anon key, which is meant to be exposed and is scoped by RLS);
   all tables have Row Level Security on; the login-attempt table has
   *no* public read/write policies at all — it's only touched through
   `SECURITY DEFINER` functions you control; user-provided text is
   rendered with `textContent`, not `innerHTML`, so it can't inject
   scripts; Supabase Auth also rate-limits its own endpoints
   independently of the app.
5. **3 wrong passwords → cooldown** — tracked server-side per email in
   `login_attempts`; a 5-minute lock kicks in on the 3rd failure and is
   checked *before* any login attempt is even sent. (Change `max_attempts`
   / `lock_minutes` in `register_failed_attempt` in the SQL file if you
   want different numbers.)
6. **One submission per account** — the `submissions.user_id` column is
   the **primary key**, and there's no UPDATE policy. A second insert
   fails outright at the database, regardless of what the frontend does.
7. **Brute-force / other protection** — the cooldown above, Supabase's
   own built-in auth rate limiting, optional CAPTCHA (step 4), RLS on
   every table, and input length limits on the answer fields
   (`reasoning` capped at 2000 chars, `rating` constrained to 1–5 by a
   `CHECK` constraint).

## Notes
- If you'd rather participants log in with an account you create for
  them (instead of self-signup), just don't publicize the "NEW AGENT"
  tab — sign-up still works the same way, you just wouldn't link people
  to it.
- Want to see all submissions? Query `public.submissions` from the
  Supabase Table Editor or SQL Editor — RLS only restricts what the
  *anon/authenticated* client sees, the dashboard (using your account)
  sees everything.
