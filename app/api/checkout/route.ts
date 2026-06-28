import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack";
import { makeReference, validateNigerianPhone } from "@/lib/format";
import type { CheckoutRequest, CheckoutResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequest;

    if (!body.tierId || !body.buyerPhone) {
      return NextResponse.json(
        { error: "tierId and buyerPhone are required" },
        { status: 400 },
      );
    }
    if (!validateNigerianPhone(body.buyerPhone)) {
      return NextResponse.json(
        { error: "Invalid Nigerian phone number" },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabase();

    // 1. Load tier + parent event (single round-trip)
    const { data: tier, error: tierErr } = await supabase
      .from("ticket_tiers")
      .select(
        `id, name, price, service_fee, capacity, sold, event_id,
         events!inner(id, slug, title, venue, event_date, is_active)`,
      )
      .eq("id", body.tierId)
      .single();

    if (tierErr || !tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // events comes back as either an object or an array depending on the join
    // shape; normalize.
    const event = Array.isArray(tier.events) ? tier.events[0] : tier.events;
    if (!event || !event.is_active) {
      return NextResponse.json({ error: "Event not available" }, { status: 410 });
    }

    if (tier.sold >= tier.capacity) {
      return NextResponse.json({ error: "Sold out" }, { status: 409 });
    }

    // Buyer pays ticket price + STAMP fee. The fee is silently added —
    // never shown as a separate line at checkout (see TicketTierSelector
    // and CheckoutPanel). The organizer's take is the bare `tier.price`,
    // which is what they entered and what they see at payout time.
    const amountKobo = tier.price + tier.service_fee;
    const ref = makeReference();
    const qrCode = crypto.randomUUID();

    // 2. Pending ticket row — webhook will flip status to 'paid'.
    // buyer_email holds the REAL email if provided; null otherwise.
    // The synthesized phone-based email below goes to Paystack only.
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .insert({
        event_id: event.id,
        tier_id: tier.id,
        buyer_name: body.buyerName ?? null,
        buyer_phone: body.buyerPhone,
        buyer_email: body.email?.trim() || null,
        qr_code: qrCode,
        paystack_ref: ref,
        amount_paid: amountKobo,
        status: "pending",
      })
      .select("id")
      .single();

    if (ticketErr || !ticket) {
      console.error("[checkout] ticket insert failed", ticketErr);
      return NextResponse.json(
        { error: "Failed to create ticket" },
        { status: 500 },
      );
    }

    // 3. Paystack init
    const callbackUrl =
      `${process.env.NEXT_PUBLIC_APP_URL!}/${event.slug}/success?reference=${ref}`;

    // Paystack requires an email; synthesize one from the phone for buyers
    // who don't supply one (consistent with how most NG ticketing platforms do it).
    const email = body.email || `${body.buyerPhone.replace(/\D/g, "")}@buyers.stamptickets.ng`;

    const init = await initializeTransaction({
      email,
      amount: amountKobo,
      reference: ref,
      metadata: {
        ticket_id: ticket.id,
        event_id: event.id,
        tier_id: tier.id,
        buyer_phone: body.buyerPhone,
        buyer_name: body.buyerName ?? null,
      },
      callbackUrl,
    });

    if (!init.status) {
      console.error("[checkout] paystack init failed", init);
      return NextResponse.json(
        { error: init.message || "Payment initialization failed" },
        { status: 502 },
      );
    }

    const payload: CheckoutResponse = {
      authorizationUrl: init.data.authorization_url,
      reference: init.data.reference,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[checkout] unhandled", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
