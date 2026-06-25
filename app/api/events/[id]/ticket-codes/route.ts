import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Door scanner offline-cache feed.
 *
 * Auth model: the event row has a `scanner_secret` (a UUID) generated at
 * creation. Door staff get a scanner URL like /scan/{eventId}?token={secret}
 * from the organizer. The token-gated endpoint here returns the QR codes of
 * paid tickets + the codes already marked used, so the scanner can build a
 * local IndexedDB cache and validate offline.
 *
 * Without the matching secret, the endpoint returns 403. The scanner_secret
 * is never exposed publicly — only the organizer (signed in) sees it.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing scanner token" }, { status: 401 });
  }

  const admin = createAdminSupabase();

  // Resolve event by id + secret in a single query
  const { data: event } = await admin
    .from("events")
    .select("id, scanner_secret, title")
    .eq("id", params.id)
    .eq("scanner_secret", token)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Invalid scanner token" }, { status: 403 });
  }

  // Load all paid tickets for this event — payload is small (just QR codes)
  const { data: tickets, error } = await admin
    .from("tickets")
    .select("qr_code, used")
    .eq("event_id", event.id)
    .eq("status", "paid");

  if (error) {
    console.error("[ticket-codes] query failed", error);
    return NextResponse.json({ error: "Couldn't load codes" }, { status: 500 });
  }

  const paid = (tickets ?? []).map((t) => t.qr_code);
  const used = (tickets ?? []).filter((t) => t.used).map((t) => t.qr_code);

  return NextResponse.json({
    eventId: event.id,
    eventTitle: event.title,
    paid,
    used,
    cachedAt: new Date().toISOString(),
  });
}
