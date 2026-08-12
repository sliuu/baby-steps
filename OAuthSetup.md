# OAuth setup — do this before Step 3

Three consoles, about 25 minutes. Everything here is account setup; no code.

> **Console UIs drift.** Google in particular has reshuffled its OAuth screens more than
> once, and the labels below may not match exactly what you see. The *values* are stable —
> what goes where doesn't change, only the names of the pages. Where a label has moved
> recently, both names are given.

---

## 0. The one idea that prevents most of the errors

The instinct is that Google redirects back to Baby Steps. It doesn't.

```
you click "Continue with Google"
  → Google authenticates you
  → Google redirects to SUPABASE      https://<ref>.supabase.co/auth/v1/callback
  → Supabase mints a session
  → Supabase redirects to BABY STEPS  http://localhost:3000/auth/callback
```

**Supabase is the OAuth client, not our app.** So:

| This URL | Goes in |
| --- | --- |
| `https://<ref>.supabase.co/auth/v1/callback` | Google's + GitHub's redirect fields |
| `http://localhost:3000/auth/callback` | Supabase's redirect allow-list only |

Never paste `localhost` into Google's or GitHub's *redirect* field. Google's *JavaScript
origins* field is the one exception, and it takes the bare origin with no path.

If you only remember one thing, remember that Google and GitHub have never heard of
`localhost:3000`.

---

## 1. Supabase, part one — create the project

1. <https://supabase.com/dashboard> → **New project**
2. Name `baby-steps`, pick the region closest to you, generate a database password.
   **Save that password in your password manager now** — it's shown once, and Step 4 needs
   it if you ever connect a SQL client directly.
3. If you're offered these three toggles (at creation, or later under **Settings → API**):

   | Setting | Choose | Why |
   | --- | --- | --- |
   | Enable Data API | **ON** | `supabase-js` speaks to this. Off = no client queries. |
   | Automatically expose new tables | **ON** | Safe only because of the row below. |
   | Enable automatic RLS | **ON** | Forces Row-Level Security on every new table. |

   The second and third are a pair. Exposing tables automatically **without** automatic RLS
   is how Supabase projects leak: create a table, forget one `ALTER TABLE`, and it's
   readable by anyone holding the publishable key — which is everyone, since it ships in the
   browser. With automatic RLS on, a table you forget to write policies for returns an empty
   result instead of everyone's rows. Wrong, but not dangerous.

   All three are changeable later. None is permanent.

4. Wait for provisioning (~2 min).
5. **Project Settings → API** (recent dashboards: **Settings → API Keys**). Copy two things:

   - **Project URL** — `https://abcdefghijklm.supabase.co`
   - **The publishable key** — labelled either `anon` `public` (a long JWT starting `eyJ…`)
     or **Publishable key** (starting `sb_publishable_…`). Newer projects show the second.
     Either works; grab whichever you have.

   Leave the `service_role` / **secret** key alone. It bypasses row-level security
   entirely, and it must never reach the browser or the repo. We don't need it in v1.

The chunk before `.supabase.co` is your **project ref**. Write it down — the next two
sections paste it repeatedly.

Your callback URL, which you'll now use twice:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

---

## 2. Google

### 2a. Consent screen

<https://console.cloud.google.com> → project dropdown in the top bar → **New Project** →
name it `baby-steps` → create, then **switch into it** using that same dropdown. Doing the
next steps in the wrong project is the single most common misstep here.

Now find the consent configuration. Newer console: **APIs & Services → OAuth consent
screen**, which may land you in a section branded **Google Auth Platform**, split into
**Branding** / **Audience** / **Clients** / **Data Access**. Older console: one page called
**OAuth consent screen**.

Fill in:

- **User type / Audience: External.** Internal is only offered on Workspace accounts and
  restricts sign-in to your own org.
- App name `Baby Steps`, your email as both support email and developer contact.
- **Scopes: add nothing.** Supabase asks for `openid`, `email`, `profile` on its own, and
  they're non-sensitive, so there's no verification review to sit through.

**Then add yourself as a Test user** (under **Audience**, or **Test users** in the older
layout). An External app in **Testing** mode will refuse to sign in anyone not on that
list, with an error that does not explain itself. Publishing isn't needed for development —
staying in Testing is fine and correct for now.

### 2b. The client

**APIs & Services → Credentials** (or **Clients** in the newer layout) → **Create
credentials → OAuth client ID** → type **Web application**, name `Baby Steps Web`.

- **Authorized JavaScript origins** → `http://localhost:3000`
  *(origin only — no trailing slash, no path)*
- **Authorized redirect URIs** → `https://<project-ref>.supabase.co/auth/v1/callback`

Create. Copy the **Client ID** and **Client secret**.

Google accepts many redirect URIs per client, so Step 17's production URL is just another
line here later. GitHub is not so generous — see below.

---

## 3. GitHub

<https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.

| Field | Value |
| --- | --- |
| Application name | `Baby Steps` |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `https://<project-ref>.supabase.co/auth/v1/callback` |

Register, then **Generate a new client secret** and copy it immediately — GitHub shows it
exactly once and there is no way to reveal it again, only to regenerate.

Two things worth knowing now rather than in Step 17:

- **A GitHub OAuth App takes exactly one callback URL.** No list. So production won't share
  this app — Step 17 registers a second one, `Baby Steps (production)`, and Supabase gets
  the production credentials in its own project. That's the normal pattern, not a
  workaround.
- **Private emails.** If your GitHub email is set to private, the profile GitHub returns
  can carry a `noreply` address or none at all. Supabase requests the `user:email` scope to
  work around this, but if your avatar shows up in Step 3 with a strange-looking email,
  that's why — not a bug in our code.

---

## 4. Supabase, part two — paste the secrets

Back in the Supabase dashboard:

**Authentication → Providers** (recent dashboards: **Authentication → Sign In / Providers**):

- **Google** → enable → paste Client ID + Client secret → save
- **GitHub** → enable → paste Client ID + Client secret → save

This page also displays the callback URL you've been pasting. Use it to check for a typo in
your project ref.

**Authentication → URL Configuration:**

- **Site URL** → `http://localhost:3000`
- **Redirect URLs** → add `http://localhost:3000/**`

The `/**` wildcard covers `/auth/callback` and anywhere else we redirect after sign-in.
This allow-list is a security control: it stops an attacker appending
`?redirect_to=evil.com` to a login link and having Supabase deliver your session there.

---

## 5. `.env.local`

Create it at the repo root — `.gitignore` already covers `.env*`, so it can't be committed
by accident:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the publishable / anon key>
```

Use these two names even if your dashboard says "publishable" — the Step 3 code will read
exactly these.

`NEXT_PUBLIC_` is a Next.js convention meaning *this value is compiled into the browser
bundle*. That's correct for both of these: the URL is public by definition, and the
publishable key is designed to be public. It is safe **only** because row-level security
(Step 4) is what actually guards the data. Anything without that prefix stays server-side —
which is why the `service_role` key must never gain one.

---

## 6. When you're done

You should have:

- [x] Supabase project created, ref written down
- [x] Project URL + publishable/anon key copied
- [x] Google: consent screen configured, **yourself added as a test user**
- [x] Google: OAuth client with origin `http://localhost:3000` + Supabase redirect URI
- [x] GitHub: OAuth app with the Supabase callback URL, secret saved
- [x] Both providers enabled in Supabase with their credentials pasted
- [x] Supabase Site URL + redirect allow-list set
- [x] `.env.local` written

Then say go, and Step 3 starts: install `@supabase/ssr`, build the login page, the
callback route, the middleware, and turn the placeholder avatar into a real account menu.

---

## Errors you're most likely to hit

| What you see | Cause |
| --- | --- |
| `redirect_uri_mismatch` (Google) | The redirect URI doesn't match **character for character**. Usual culprits: a trailing slash, `http` vs `https`, or a typo'd project ref. |
| `Access blocked: Baby Steps has not completed verification` | External + Testing, and your account isn't on the test-user list. Add it. |
| GitHub: `The redirect_uri MUST match the registered callback URL` | The OAuth app's callback points at `localhost` instead of Supabase. |
| Sign-in succeeds, then lands on an error page | Supabase's **Redirect URLs** allow-list is missing `http://localhost:3000/**`. |
| `Invalid API key` | Copied the `service_role`/secret key, or lost a character on a long JWT. |
| Google works, GitHub doesn't (or vice versa) | Each provider has its own enable toggle in Supabase. Easy to save one and not the other. |
