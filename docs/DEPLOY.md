# Deploying STAMP

End-to-end checklist to get STAMP live at `stamptickets.ng` (or any domain). Plan for ~90 minutes the first time. Order matters — services depend on each other.

```
GitHub  →  Supabase  →  Paystack  →  Termii  →  Vercel  →  DNS  →  final wiring
```

You'll create accounts on five services if you don't have them already. All have free tiers that fit V1.

---

## 0. Before you start

Have these open in tabs:

- [github.com](https://github.com)
- [supabase.com](https://supabase.com)
- [paystack.com](https://paystack.com)
- [termii.com](https://termii.com)
- [vercel.com](https://vercel.com)
- Your domain registrar (Spaceship, Namecheap, Cloudflare — wherever `stamptickets.ng` lives)

Have these ready to copy/paste:

- Your real Nigerian phone number (for Paystack OTP)
- An email you actually check (for Supabase magic links and Paystack webhooks)
- The contents of `.env.example` open in a text file — you'll fill it in as you go

---

## 1. Push to GitHub

From the repo root:

```bash
git init
git add .
git commit -m "stamp v1 — initial public commit"
gh repo create stamp --private --source=. --push
```

If you don't have the GitHub CLI, do it through the web UI: create an empty private repo named `stamp`, then:

```bash
git remote add origin git@github.com:YOUR_USERNAME/stamp.git
git branch -M main
git push -u origin main
```

Keep this private. The `.env.local` is in `.gitignore` already, but double-check before pushing.

---

## 2. Supabase

### 2.1 Create the project

1. Sign in to Supabase, click **New project**.
2. Name: `stamp-prod`. Region: `West EU (Ireland)` — closest to Nigerian users until Supabase opens Africa regions.
3. Set a strong database password and save it somewhere — you won't see it again.
4. Wait ~2 minutes for provisioning.

### 2.2 Run the schema

1. In the project sidebar: **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from your repo, paste the whole thing into the SQL editor, **Run**.
3. You should see "Success. No rows returned" with no red errors.

> If you ever update the schema later, never re-run `schema.sql` on a populated DB — use the files in `supabase/migrations/` in numeric order.

### 2.3 Configure storage buckets

The schema creates `qr-codes` and `posters` buckets as public. Confirm:

1. Sidebar: **Storage**.
2. You should see `qr-codes` and `posters`. Both should be marked **Public**.
3. If not, click each one → **Settings** → toggle public → save.

### 2.4 Configure auth (magic-link)

1. Sidebar: **Authentication** → **Providers**.
2. Make sure **Email** is enabled. Disable everything else for now.
3. Sidebar: **Authentication** → **URL Configuration**.
   - **Site URL**: `https://stamptickets.ng` (or your real domain — you can edit this later if you don't have the domain yet, but the magic links won't work until you do).
   - **Redirect URLs**: add `https://stamptickets.ng/auth/callback` AND `http://localhost:3000/auth/callback` (so local dev works too).
4. Sidebar: **Authentication** → **Email Templates** → **Magic Link**. The default works, but you can rewrite the body. Keep the `{{ .ConfirmationURL }}` variable.

### 2.5 Grab the keys

Sidebar: **Settings** → **API**. Copy these into your `.env.local` draft:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # the "anon public" key
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # the "service_role" key — secret
```

> **Never paste the service-role key into client code or commit it.** It bypasses RLS.

---

## 3. Paystack

### 3.1 Get the keys

1. Sign in to [dashboard.paystack.com](https://dashboard.paystack.com).
2. Top-right toggle: stay on **Test mode** while you're setting up.
3. Sidebar: **Settings** → **API Keys & Webhooks**.
4. Copy:
   ```env
   PAYSTACK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
   ```

Switch to live keys (`sk_live_...`) only when you've completed end-to-end testing.

### 3.2 Configure the webhook

1. Same page (**API Keys & Webhooks**), find **Webhook URL**.
2. Set it to `https://stamp-eight.vercel.app/api/webhook/paystack` (or your real domain).
3. Save.

> You can come back and update this URL once you've deployed to Vercel. For now, the placeholder is fine if you're using your real domain.

### 3.3 Enable Transfers (required for payouts)

Paystack disables Transfers by default. To turn them on:

1. Sidebar: **Settings** → **Preferences** → **Transfers**.
2. Toggle on. Paystack will ask you to verify your business details and may require ID upload + business registration.
3. **This takes 1-3 business days the first time.** Start it early.

Without Transfers enabled, the **Withdrawal** flow at `/dashboard/payouts` will accept a request but Paystack will return a "transfers disabled" error.

### 3.4 (Optional) Disable Transfer OTP

By default, every transfer requires an OTP sent to your registered email/phone. For an automated payout flow this gets tedious:

1. Sidebar: **Settings** → **Preferences** → **Disable OTP for Transfers**.
2. Paystack will send a verification OTP to confirm the change.
3. After this, transfers initiated by STAMP go through without OTP.

Recommendation: **leave OTP enabled in test mode**. Disable it for production once you trust the system end-to-end and have monitoring on the webhook.

---

## 4. Termii

### 4.1 Sign up + grab the API key

1. Sign up at [termii.com](https://termii.com). Use your real business email.
2. Top-right account menu → **API Keys** → copy:
   ```env
   TERMII_API_KEY=TLxxxxxxxxxxxxxxx
   ```

### 4.2 Register the sender ID

1. Sidebar: **Sender ID** → **Request New Sender ID**.
2. Sender name: `STAMP`. Reason: "Ticket delivery for campus events."
3. Approval is usually 24-48 hours.

> Until your sender ID is approved, Termii falls back to generic numeric sender IDs. SMS still goes through; the brand experience is just weaker.

### 4.3 Enable WhatsApp Business

This is what powers the in-WhatsApp ticket delivery.

1. Sidebar: **WhatsApp** → follow the onboarding flow.
2. You'll need a dedicated phone number (a fresh SIM, ideally) — once added to WhatsApp Business via Termii, you can't use that number in the regular WhatsApp app any more.
3. Approval is usually same-day, occasionally up to a week.

> Until WhatsApp is approved, the SMS fallback in `lib/termii.ts` will quietly take over. Buyers still receive their ticket.

---

## 5. Vercel

### 5.1 Import the repo

1. Sign in to [vercel.com](https://vercel.com).
2. **Add New** → **Project** → **Import Git Repository** → pick `YOUR_USERNAME/stamp`.
3. Framework preset: Vercel will detect **Next.js**. Leave defaults.
4. **DO NOT click Deploy yet.** First, set env vars.

### 5.2 Add environment variables

Expand **Environment Variables** before deploying. Paste all of these:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from step 2.5 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 2.5 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 2.5 |
| `PAYSTACK_SECRET_KEY` | from step 3.1 |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | from step 3.1 |
| `TERMII_API_KEY` | from step 4.1 |
| `NEXT_PUBLIC_APP_URL` | `https://stamptickets.ng` |

Set the scope of each to **Production, Preview, Development** unless you have a reason otherwise.

### 5.3 Deploy

Click **Deploy**. First build takes ~90 seconds.

When it finishes, Vercel gives you a `.vercel.app` URL (e.g. `stamp-abc123.vercel.app`). Open it — you should see the landing page.

> If the build fails on `next/font/google`, your Vercel deployment region is blocked from Google Fonts. Re-region the project to a US/EU region (Vercel project settings → Functions → region).

---

## 6. DNS

### 6.1 Add the domain in Vercel

1. Vercel project → **Settings** → **Domains** → **Add**.
2. Enter `stamptickets.ng` and `www.stamptickets.ng` (Vercel will redirect www → apex automatically).
3. Vercel shows you DNS records to create. Two options:
   - **Apex (`stamptickets.ng`)**: an `A` record pointing to `76.76.21.21`.
   - **www**: a `CNAME` to `cname.vercel-dns.com`.

### 6.2 Point DNS at Vercel

In your registrar (Spaceship in your case):

1. Domain settings → **DNS** → **Manage**.
2. Add the records Vercel showed you. Set TTL to `Automatic` or `300`.
3. Save.

Propagation: usually 5-30 minutes, occasionally up to an hour. Vercel polls and flips the domain to **Valid** automatically.

### 6.3 SSL

Vercel issues a Let's Encrypt cert automatically once DNS resolves. No action needed.

---

## 7. Final wiring

### 7.1 Update the live Paystack webhook URL

Go back to **Paystack → Settings → API Keys & Webhooks** and confirm:
```
https://stamptickets.ng/api/webhook/paystack
```
Save again if you originally entered a placeholder.

### 7.2 Confirm Supabase auth URLs

**Authentication → URL Configuration**:
- Site URL: `https://stamptickets.ng`
- Redirect URLs include: `https://stamptickets.ng/auth/callback`

### 7.3 Smoke test

Walk through the full happy path on the live site:

1. **Landing** — visit `https://stamptickets.ng`, confirm the seal renders.
2. **Sign in** — `/login`, request a magic link, click it from your email, land on `/dashboard`.
3. **Settings** — go to `/dashboard/settings`, fill in bank details with a test NUBAN. Confirm the account resolves and saves.
4. **Create event** — `/dashboard/new`, fill in details, add a tier, upload a poster. Save.
5. **Buy a ticket** — open the event link in an incognito window, pick a tier, run a test purchase via Paystack test cards ([list here](https://paystack.com/docs/payments/test-payments)).
6. **Receive ticket** — check the buyer phone number's WhatsApp (or SMS if WhatsApp isn't approved yet).
7. **Scan it** — open the door scanner link on a phone, scan the QR from the WhatsApp message. You should see the big green ADMIT screen.
8. **Withdraw** — `/dashboard/payouts`, request a withdrawal of the earned face value. With test keys this won't actually move money but the flow should complete.

If every step works, **switch Paystack to Live mode** and replace the keys in Vercel:
- `PAYSTACK_SECRET_KEY` → `sk_live_...`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` → `pk_live_...`

Trigger a redeploy in Vercel (it auto-deploys on env-var change in most projects, but force-deploy from the dashboard if not).

---

## 8. Day-2 operations

### 8.1 Watching for errors

- **Vercel** → project → **Logs** tab — runtime errors from API routes show up here.
- **Supabase** → **Logs** → filter by table for DB issues.
- **Paystack** → **Transactions** + **Transfers** tabs.

### 8.2 Updating the schema

Never re-run `schema.sql`. New changes go in numbered files under `supabase/migrations/`:

```
supabase/migrations/002_organizer_auth.sql
supabase/migrations/003_organizer_payout.sql
supabase/migrations/004_withdrawals.sql
supabase/migrations/005_event_scanner_secret.sql
```

To apply: Supabase SQL Editor → paste the migration → run.

### 8.3 Rotating keys

If a key leaks (committed to GitHub by accident, sent to the wrong person, etc.):

- **Supabase service role**: dashboard → Settings → API → roll. Update Vercel env var.
- **Paystack secret**: dashboard → API Keys & Webhooks → reset.
- **Termii**: rotate from the account menu.

All three trigger an immediate redeploy when changed in Vercel.

---

## Troubleshooting

**Magic links don't work — clicking the email opens a "code missing" page.**
→ Supabase Site URL or Redirect URLs don't match. Check 7.2.

**Ticket purchases succeed in Paystack but no WhatsApp arrives.**
→ Either Termii sender ID isn't approved or your phone number formatting is off. Check Vercel logs for the webhook handler — it logs every delivery attempt.

**Webhook responds with 401 every time.**
→ Signature mismatch. The `PAYSTACK_SECRET_KEY` in Vercel doesn't match what Paystack is signing with. Re-copy from the Paystack dashboard.

**Build fails: "Cannot find module '@/lib/...'"**
→ Restart the Vercel build with the cache cleared.

**Scanner page says "missing scanner token".**
→ The link wasn't copied from the dashboard. Use the "Door scanner link" card on the event dashboard.

---

That's it. Once it's live, the hardest day is the first day. After that everything is just `git push` and Vercel handles the rest.
