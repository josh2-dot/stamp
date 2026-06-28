import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ticket lookup for admin support workflow. Searches across:
 *  - Paystack reference (exact match — that's how Paystack identifies the
 *    transaction in its dashboard)
 *  - QR code UUID (exact)
 *  - Buyer phone (cleaned of formatting before match — buyers paste back
 *    whatever they have)
 *
 * Returns up to 20 results. Most common case is exactly one.
 */
export async function GET(req: NextRequest) {
  const me = await getCurrentAdmin();
  if (!me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const select = `
    id, status, buyer_name, buyer_phone, qr_code, paystack_ref,
    amount_paid, created_at, used, used_at, qr_image_url,
    ticket_tiers!inner(name),
    events!inner(title, venue, event_date)
  `;

  // Try the most-distinctive matches first, then phone as a wider net.
  // Phone "cleaning": strip non-digits, then match the trailing 10 digits
  // (handles +234, 0, spaces, dashes). We store phones with the country
  // prefix variants, so we match on `like`.
  const digitsOnly = q.replace(/\D/g, "");
  const last10 = digitsOnly.slice(-10);

  // Reference + QR are exact matches
  const exactQuery = admin
    .from("tickets")
    .select(select)
    .or(`paystack_ref.eq.${q},qr_code.eq.${q}`)
    .limit(5);

  const phoneQuery =
    last10.length >= 10
      ? admin
          .from("tickets")
          .select(select)
          .ilike("buyer_phone", `%${last10}`)
          .limit(20)
      : null;

  const [{ data: exact }, phoneResp] = await Promise.all([
    exactQuery,
    phoneQuery,
  ]);

  // Merge + dedupe by id, exact matches first
  const tickets = new Map<string, unknown>();
  for (const t of (exact ?? []) as Array<{ id: string }>) tickets.set(t.id, t);
  for (const t of (phoneResp?.data ?? []) as Array<{ id: string }>) {
    if (!tickets.has(t.id)) tickets.set(t.id, t);
  }

  const flatten = (rows: Iterable<unknown>) => {
    const out: unknown[] = [];
    for (const t of rows) {
      const row = t as {
        id: string;
        status: string;
        buyer_name: string | null;
        buyer_phone: string;
        qr_code: string;
        paystack_ref: string;
        amount_paid: number;
        created_at: string;
        used: boolean;
        used_at: string | null;
        qr_image_url: string | null;
        ticket_tiers: { name: string } | Array<{ name: string }>;
        events:
          | { title: string; venue: string; event_date: string }
          | Array<{ title: string; venue: string; event_date: string }>;
      };
      const tier = Array.isArray(row.ticket_tiers)
        ? row.ticket_tiers[0]
        : row.ticket_tiers;
      const event = Array.isArray(row.events) ? row.events[0] : row.events;
      out.push({
        id: row.id,
        status: row.status,
        buyer_name: row.buyer_name,
        buyer_phone: row.buyer_phone,
        qr_code: row.qr_code,
        paystack_ref: row.paystack_ref,
        amount_paid: row.amount_paid,
        created_at: row.created_at,
        used: row.used,
        used_at: row.used_at,
        qr_image_url: row.qr_image_url,
        tier_name: tier?.name ?? "—",
        event_title: event?.title ?? "—",
        event_venue: event?.venue ?? "—",
        event_date: event?.event_date ?? "",
      });
    }
    return out;
  };

  return NextResponse.json({ tickets: flatten(tickets.values()) });
}
