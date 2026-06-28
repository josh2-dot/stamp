import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify, withSuffix } from "@/lib/slug";
import { calculatePlatformFee } from "@/lib/fee-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateEventBody {
  title: string;
  venue: string;
  description?: string;
  /** ISO datetime — local input is converted to UTC client-side */
  event_date: string;
  tiers: Array<{
    name: string;
    /** Ticket price (what the buyer pays). User inputs naira, we store kobo.
     *  STAMP's fee is computed server-side; organizers cannot set it. */
    price_naira: number;
    capacity: number;
  }>;
}

export async function POST(req: NextRequest) {
  // Auth
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: CreateEventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  // Validate
  if (!body.title?.trim() || !body.venue?.trim() || !body.event_date) {
    return NextResponse.json(
      { error: "Title, venue, and date are required" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.tiers) || body.tiers.length === 0) {
    return NextResponse.json({ error: "At least one ticket tier is required" }, { status: 400 });
  }
  for (const t of body.tiers) {
    if (!t.name?.trim()) {
      return NextResponse.json({ error: "Every tier needs a name" }, { status: 400 });
    }
    if (!Number.isFinite(t.price_naira) || t.price_naira < 0) {
      return NextResponse.json({ error: `Invalid price for tier "${t.name}"` }, { status: 400 });
    }
    if (!Number.isFinite(t.capacity) || t.capacity <= 0) {
      return NextResponse.json({ error: `Invalid capacity for tier "${t.name}"` }, { status: 400 });
    }
  }

  const admin = createAdminSupabase();

  // Resolve organizer
  const { data: organizer, error: orgErr } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (orgErr || !organizer) {
    return NextResponse.json({ error: "Organizer profile not found" }, { status: 404 });
  }

  // Build a unique slug — start with title, add a 4-char suffix on collision
  const baseSlug = slugify(body.title);
  let slug = baseSlug || `event-${Date.now().toString(36)}`;
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await admin
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = withSuffix(baseSlug, Math.random().toString(36).slice(2, 6));
  }

  // Insert event
  const { data: event, error: eventErr } = await admin
    .from("events")
    .insert({
      organizer_id: organizer.id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      venue: body.venue.trim(),
      event_date: body.event_date,
      slug,
      is_active: true,
    })
    .select("id, slug")
    .single();

  if (eventErr || !event) {
    console.error("[events/create] insert failed", eventErr);
    return NextResponse.json({ error: "Couldn't create event" }, { status: 500 });
  }

  // Insert tiers — service_fee is computed centrally, not supplied by client.
  // calculatePlatformFee reads the DB-stored fee config (with cache).
  const tierRows = await Promise.all(
    body.tiers.map(async (t, idx) => {
      const priceKobo = Math.round(t.price_naira * 100);
      return {
        event_id: event.id,
        name: t.name.trim(),
        price: priceKobo,
        service_fee: await calculatePlatformFee(priceKobo),
        capacity: Math.floor(t.capacity),
        sort_order: idx,
      };
    }),
  );

  const { error: tierErr } = await admin.from("ticket_tiers").insert(tierRows);

  if (tierErr) {
    // Roll back the event row to avoid orphans
    await admin.from("events").delete().eq("id", event.id);
    console.error("[events/create] tier insert failed", tierErr);
    return NextResponse.json({ error: "Couldn't add tiers" }, { status: 500 });
  }

  return NextResponse.json({ id: event.id, slug: event.slug });
}
