import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { VerifyResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { qr: string } },
) {
  const qr = params.qr;
  const eventId = req.nextUrl.searchParams.get("eventId");
  const token = req.nextUrl.searchParams.get("token");

  if (!qr) {
    return NextResponse.json<VerifyResponse>(
      { valid: false, reason: "invalid" },
      { status: 400 },
    );
  }

  // Token-bound verification: require eventId+token and ensure they match
  // a real event. Without this, anyone with a guessed ticket UUID could
  // burn it via the API.
  if (!eventId || !token) {
    return NextResponse.json<VerifyResponse>(
      { valid: false, reason: "invalid" },
      { status: 401 },
    );
  }

  const supabase = createAdminSupabase();

  const { data: eventCheck } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("scanner_secret", token)
    .maybeSingle();

  if (!eventCheck) {
    return NextResponse.json<VerifyResponse>(
      { valid: false, reason: "invalid" },
      { status: 403 },
    );
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      `id, event_id, status, used, used_at, buyer_name, buyer_phone,
       ticket_tiers!inner(name)`,
    )
    .eq("qr_code", qr)
    .maybeSingle();

  if (error || !ticket) {
    return NextResponse.json<VerifyResponse>({ valid: false, reason: "invalid" });
  }

  if (ticket.event_id !== eventId) {
    return NextResponse.json<VerifyResponse>({ valid: false, reason: "wrong_event" });
  }

  if (ticket.status !== "paid") {
    return NextResponse.json<VerifyResponse>({ valid: false, reason: "unpaid" });
  }

  if (ticket.used) {
    return NextResponse.json<VerifyResponse>({
      valid: false,
      reason: "already_scanned",
      usedAt: ticket.used_at ?? undefined,
    });
  }

  // Atomic check-in: only succeeds if still unused.
  const { data: updated, error: updateErr } = await supabase
    .from("tickets")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("id", ticket.id)
    .eq("used", false)
    .select("id")
    .maybeSingle();

  if (updateErr || !updated) {
    // Lost a race — someone else just scanned it
    return NextResponse.json<VerifyResponse>({
      valid: false,
      reason: "already_scanned",
    });
  }

  const tier = Array.isArray(ticket.ticket_tiers)
    ? ticket.ticket_tiers[0]
    : ticket.ticket_tiers;

  return NextResponse.json<VerifyResponse>({
    valid: true,
    ticket: {
      id: ticket.id,
      tierName: tier?.name ?? "Ticket",
      buyerName: ticket.buyer_name,
      buyerPhone: ticket.buyer_phone,
    },
  });
}
