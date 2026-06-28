import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PromoteBody {
  /** All raw-nomination ids that should resolve to the same ballot entry */
  nomination_ids: string[];
  /** When set, merge into this existing ballot entry. Otherwise create new. */
  into_nominee_id?: string;
  /** For new nominee creation */
  display_name?: string;
  description?: string;
  photo_url?: string;
}

/**
 * Promote a group of raw nominations onto the ballot. The UI sends every
 * raw-nomination id that belongs to one nominee (e.g. all 12 entries for
 * "Joshua Theophilus"), and we either:
 *
 *   1. Create a new award_nominees row using display_name (default: the
 *      common nominee_name from the raw entries)
 *   2. Or merge them into an existing nominee row (into_nominee_id)
 *
 * All passed nominations get their status flipped to 'promoted' and
 * resolved_to pointed at the target nominee.
 */
export async function POST(req: NextRequest) {
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: PromoteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!Array.isArray(body.nomination_ids) || body.nomination_ids.length === 0) {
    return NextResponse.json(
      { error: "Pass one or more nomination_ids to promote" },
      { status: 400 },
    );
  }

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!organizer) {
    return NextResponse.json({ error: "No organizer profile" }, { status: 403 });
  }

  // Load all raw nominations + verify all belong to the same category +
  // event, and the organizer owns the event
  const { data: noms } = await admin
    .from("award_nominations")
    .select("id, category_id, event_id, nominee_name, status")
    .in("id", body.nomination_ids);

  if (!noms || noms.length === 0) {
    return NextResponse.json({ error: "Nominations not found" }, { status: 404 });
  }
  if (noms.length !== body.nomination_ids.length) {
    return NextResponse.json(
      { error: "Some nominations were not found." },
      { status: 404 },
    );
  }
  const first = noms[0];
  if (!first) {
    return NextResponse.json({ error: "Nominations not found" }, { status: 404 });
  }
  const categoryId = first.category_id;
  const eventId = first.event_id;
  if (noms.some((n) => n.category_id !== categoryId)) {
    return NextResponse.json(
      { error: "All nominations must be from the same category." },
      { status: 400 },
    );
  }

  // Ownership check via the event
  const { data: ev } = await admin
    .from("events")
    .select("organizer_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev || ev.organizer_id !== organizer.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Resolve the target nominee — either existing or new
  let nomineeId: string;
  if (body.into_nominee_id) {
    const { data: existing } = await admin
      .from("award_nominees")
      .select("id, category_id")
      .eq("id", body.into_nominee_id)
      .maybeSingle();
    if (!existing || existing.category_id !== categoryId) {
      return NextResponse.json(
        { error: "Target nominee doesn't exist in this category." },
        { status: 400 },
      );
    }
    nomineeId = existing.id;
  } else {
    // Use the provided display name, or fall back to the most common
    // raw name in the group (which the UI defaults to anyway)
    const fallback = first.nominee_name;
    const displayName = body.display_name?.trim() || fallback;

    // Default sort_order: append to end
    const { data: last } = await admin
      .from("award_nominees")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = (last?.sort_order ?? -1) + 1;

    const { data: created, error: createErr } = await admin
      .from("award_nominees")
      .insert({
        category_id: categoryId,
        event_id: eventId,
        display_name: displayName,
        description: body.description ?? null,
        photo_url: body.photo_url ?? null,
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (createErr || !created) {
      console.error("[promote] nominee create failed", createErr);
      return NextResponse.json({ error: "Couldn't create nominee" }, { status: 500 });
    }
    nomineeId = created.id;
  }

  // Resolve all nominations
  const { error: updErr } = await admin
    .from("award_nominations")
    .update({ status: "promoted", resolved_to: nomineeId })
    .in("id", body.nomination_ids);

  if (updErr) {
    console.error("[promote] update failed", updErr);
    return NextResponse.json({ error: "Couldn't promote" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, nominee_id: nomineeId });
}
