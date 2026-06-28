import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Used by the buyer's success page to poll for ticket-paid status.
 * Returns only the fields the buyer should see (no organizer info).
 *
 * Anyone with the reference can read these fields — that's by design:
 * the reference was generated server-side and only the buyer holds it,
 * since Paystack only returns it in the success redirect to that buyer.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { ref: string } },
) {
  const supabase = createAdminSupabase();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      `status, qr_code, qr_image_url, buyer_name, buyer_phone,
       ticket_tiers!inner(name),
       events!inner(title, venue, event_date)`,
    )
    .eq("paystack_ref", params.ref)
    .maybeSingle();

  if (error || !ticket) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const tier = Array.isArray(ticket.ticket_tiers)
    ? ticket.ticket_tiers[0]
    : ticket.ticket_tiers;
  const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;

  return NextResponse.json({
    status: ticket.status,
    qr_code: ticket.qr_code,
    qr_image_url: ticket.qr_image_url,
    buyer_name: ticket.buyer_name,
    buyer_phone: ticket.buyer_phone,
    tier_name: tier?.name ?? "",
    event_title: event?.title ?? "",
    event_venue: event?.venue ?? "",
    event_date: event?.event_date ?? "",
  });
}
