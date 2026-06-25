# STAMP

Campus event ticketing for Nigerian universities. V1 launches at **Rivers State University, Port Harcourt**.

```
Stack:  Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Paystack · Termii
Brand:  Dark-first. Syne 800 / DM Sans. Stamp seal as the signature mark.
```

---

## Build state

This repo is being built in two passes.

**Pass 1 — Foundation (done):**

- [x] DB schema with RLS + realtime + atomic `increment_tier_sold` RPC
- [x] `/lib` utilities (supabase, paystack, termii, qr, storage, format)
- [x] `/types` — single source of truth for cross-cutting types
- [x] `/app/api/checkout` — pending ticket + Paystack init
- [x] `/app/api/webhook/paystack` — signature verify, QR gen, WhatsApp/SMS delivery, organizer notify
- [x] `/app/api/tickets/verify/[qr]` — atomic check-in with race-loss handling
- [x] `/app/api/events/[id]/dashboard` — aggregated snapshot with hourly buckets
- [x] Root layout with font loading + global styles
- [x] Tailwind tokens for full STAMP palette

**Pass 2 — UI:**

- [ ] `StampSeal`, `Button`, `Card`, `Badge`, `Input` primitives
- [ ] Landing: Hero, HowItWorks, Features, Pricing, Footer
- [ ] Event page (`/[slug]`) + TicketTierSelector
- [ ] Checkout + Success flows
- [ ] Organizer dashboard + Live feed + recharts
- [ ] Door scanner page

---

## Setup

```bash
pnpm install            # or npm / yarn
cp .env.example .env.local
# Fill in the values, then:
pnpm dev
```

For full production deployment (GitHub → Supabase → Paystack → Termii → Vercel → DNS), see [`docs/DEPLOY.md`](./docs/DEPLOY.md).

### Supabase

1. Create a new project.
2. Open the SQL editor and run `supabase/schema.sql` end to end.
3. Create two public storage buckets (the schema does this idempotently): `qr-codes`, `posters`.
4. Copy the URL, anon key, and service role key into `.env.local`.

### Paystack

1. Get your **secret key** from Settings → API Keys.
2. Add the webhook URL in Settings → Webhooks:
   `https://YOUR_DOMAIN/api/webhook/paystack`
3. Paystack signs every webhook with `x-paystack-signature` (HMAC-SHA512 of the raw body). Our handler rejects anything that doesn't verify.

### Termii

1. Get the API key from the Termii dashboard.
2. The default sender ID we use is `STAMP` — request that on the Termii sender ID approval flow.
3. WhatsApp must be approved on your Termii account separately. If it isn't approved yet, the SMS fallback in `lib/termii.ts` will quietly take over.

---

## Money in this codebase

All amounts are integers in **kobo** end to end. We only convert to naira at the display layer (`lib/format.ts → formatNaira`). The DB has `check (amount >= 0)` constraints to keep that honest.

`amount_paid` on a ticket = `tier.price + tier.service_fee`. The `service_fee` is STAMP's cut; the rest is the organizer's gross.

---

## Why a server-side webhook handles QR + delivery

The buyer hits the Paystack-hosted page, pays, then bounces to `/[slug]/success?reference=...` while Paystack independently fires the webhook to our server. Two reasons we do the work in the webhook, not on the success page:

1. **Trust.** The success page can be forged (anyone can hit a URL with a guessed reference). The webhook is signed.
2. **Reliability.** If the buyer closes their browser between paying and the redirect, we still issue the ticket.

The success page polls or subscribes to the ticket row to know when the webhook has finished. (Wired up in pass 2.)

---

## Door scanner notes

- `/scan/[eventId]` is mobile-only. It opens the back camera, scans, and shows a full-screen green or red overlay.
- The verify endpoint does an **atomic** check-in (`update ... where used = false returning id`). If two scanners hit the same ticket within milliseconds, only one wins; the other gets `already_scanned`.
- Offline-tolerance: the scanner caches the event's paid-ticket ID list in IndexedDB and falls back to local validation when the network is gone. (Pass 2.)
