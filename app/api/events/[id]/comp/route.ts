import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { validateNigerianPhone, makeReference } from "@/lib/format";
import { generateQR } from "@/lib/qr";
import { uploadQRToSupabase } from "@/lib/storage";
import { deliverTicket } from "@/lib/termii";
import { sendEmail, buildTicketEmailHtml } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CompBody {
  tier_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string;
  note?: string;
}

/**
 * Generate a complimentary ticket for VIPs (lecturers, sponsors, media, etc.).
 *
 * Comp tickets are ordinary `tickets` rows with amount_paid=0,
 * status='paid', is_complimentary=true. This keeps the door scanner,
 * ticket-page, ticket-lookup, and SMS delivery code working unchanged —
 * the bouncer at the gate has no idea this ticket was free.
 *
 * Sales-count + revenue aggregations exclude these (see the dashboard
 * route). The organizer sees comp count as a small separate line so they
 * can track without it polluting sales metrics.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Auth + ownership
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!organizer) {
    return NextResponse.json(
      { error: "No organizer profile" },
      { status: 403 },
    );
  }

  let body: CompBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!body.tier_id || !body.buyer_name?.trim() || !body.buyer_phone) {
    return NextResponse.json(
      { error: "tier_id, buyer_name, and buyer_phone are required" },
      { status: 400 },
    );
  }
  if (!validateNigerianPhone(body.buyer_phone)) {
    return NextResponse.json(
      { error: "Invalid Nigerian phone number" },
      { status: 400 },
    );
  }

  // Load tier + ownership-via-event check in one go
  const { data: tier } = await admin
    .from("ticket_tiers")
    .select(
      "id, name, capacity, sold, event_id, events!inner(id, title, venue, event_date, organizer_id, is_active)",
    )
    .eq("id", body.tier_id)
    .maybeSingle();

  if (!tier) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }
  const event = Array.isArray(tier.events) ? tier.events[0] : tier.events;
  if (!event || event.organizer_id !== organizer.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (event.id !== params.id) {
    return NextResponse.json(
      { error: "Tier does not belong to this event" },
      { status: 400 },
    );
  }
  if (tier.sold >= tier.capacity) {
    return NextResponse.json(
      { error: "Tier is sold out — can't issue comps without capacity" },
      { status: 409 },
    );
  }

  const qrCode = crypto.randomUUID();
  const ref = `COMP-${makeReference()}`;

  // Insert the ticket
  const { data: ticket, error: insertErr } = await admin
    .from("tickets")
    .insert({
      event_id: event.id,
      tier_id: tier.id,
      buyer_name: body.buyer_name.trim(),
      buyer_phone: body.buyer_phone,
      buyer_email: body.buyer_email?.trim() || null,
      qr_code: qrCode,
      paystack_ref: ref,
      amount_paid: 0,
      status: "paid",
      is_complimentary: true,
      comp_note: body.note?.trim() || null,
    })
    .select("id")
    .single();

  if (insertErr || !ticket) {
    console.error("[comp-ticket] insert failed", insertErr);
    return NextResponse.json(
      { error: "Couldn't create comp ticket" },
      { status: 500 },
    );
  }

  // Increment tier.sold so capacity counts include comps (door perspective)
  await admin
    .from("ticket_tiers")
    .update({ sold: tier.sold + 1 })
    .eq("id", tier.id);

  // Generate QR + upload
  let qrImageUrl: string | null = null;
  try {
    const pngBuf = await generateQR(qrCode);
    qrImageUrl = await uploadQRToSupabase(ticket.id, pngBuf);
    if (qrImageUrl) {
      await admin
        .from("tickets")
        .update({ qr_image_url: qrImageUrl })
        .eq("id", ticket.id);
    }
  } catch (err) {
    console.error("[comp-ticket] qr generation failed", err);
    // Not fatal — the web ticket page still renders the QR from qr_code
  }

  // Format date for delivery messages
  const dateStr = new Date(event.event_date).toLocaleString("en-NG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

  // Deliver via SMS + email if available — same path as paid tickets so
  // the recipient experience is identical.
  const delivery = await deliverTicket({
    phone: body.buyer_phone,
    qrCode,
    eventTitle: event.title,
    venue: event.venue,
    date: dateStr,
    tierName: tier.name,
    qrImageUrl: qrImageUrl ?? "",
  });

  if (body.buyer_email?.trim() && qrImageUrl) {
    const emailResult = await sendEmail({
      to: body.buyer_email.trim(),
      subject: `Your ticket — ${event.title}`,
      html: buildTicketEmailHtml({
        eventTitle: event.title,
        venue: event.venue,
        date: dateStr,
        tierName: tier.name,
        buyerName: body.buyer_name.trim(),
        qrImageUrl,
        ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/t/${qrCode}`,
      }),
    });
    if (!emailResult.ok && !emailResult.skipped) {
      console.error("[comp-ticket] email delivery failed", emailResult.error);
    }
  }

  return NextResponse.json({
    ok: true,
    ticket_id: ticket.id,
    qr_code: qrCode,
    delivery_channel: delivery.channel,
    delivery_ok: delivery.ok,
  });
}
