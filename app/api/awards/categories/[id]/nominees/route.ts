import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateNomineeBody {
  display_name: string;
  description?: string;
  photo_url?: string;
  sort_order?: number;
}

/**
 * Organizer-created nominee. This is the "I already know who my nominees
 * are — I don't need public nominations" path.
 *
 * Allowed phases: draft, nominations_open, moderation. Once voting opens,
 * the ballot is locked to preserve fairness for voters who already saw
 * the original list.
 *
 * Sits alongside the existing "promote raw nomination" path — some
 * organizers will use one, some the other, some a mix (public nominations
 * for open categories, direct ballot for the categories where they've
 * already decided). Both paths create rows in the same `award_nominees`
 * table; downstream (voting, leaderboard, reveal) doesn't care which
 * path the nominee came in through.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: CreateNomineeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!body.display_name?.trim()) {
    return NextResponse.json(
      { error: "Nominee name is required" },
      { status: 400 },
    );
  }
  if (body.display_name.trim().length > 80) {
    return NextResponse.json(
      { error: "Nominee name is too long (max 80 characters)" },
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

  const { data: category } = await admin
    .from("award_categories")
    .select("id, event_id, phase, events!inner(organizer_id)")
    .eq("id", params.id)
    .maybeSingle();
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  const ev = Array.isArray(category.events) ? category.events[0] : category.events;
  if ((ev as { organizer_id: string }).organizer_id !== organizer.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Phase gate — once voting is open, ballot is frozen. Fairness argument:
  // people voted based on the visible list; adding a nominee mid-vote is
  // effectively changing the rules of the contest.
  if (!["draft", "nominations_open", "moderation"].includes(category.phase)) {
    return NextResponse.json(
      {
        error:
          "Can't add nominees once voting has opened. Close voting to make changes.",
      },
      { status: 409 },
    );
  }

  // Default sort_order: append to end of ballot
  let sortOrder = body.sort_order;
  if (sortOrder === undefined) {
    const { data: last } = await admin
      .from("award_nominees")
      .select("sort_order")
      .eq("category_id", params.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (last?.sort_order ?? -1) + 1;
  }

  const { data: created, error: insertErr } = await admin
    .from("award_nominees")
    .insert({
      category_id: params.id,
      event_id: category.event_id,
      display_name: body.display_name.trim(),
      description: body.description?.trim() || null,
      photo_url: body.photo_url?.trim() || null,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (insertErr || !created) {
    console.error("[nominees POST] insert failed", insertErr);
    return NextResponse.json(
      { error: insertErr?.message || "Couldn't add nominee" },
      { status: 500 },
    );
  }

  return NextResponse.json({ nominee: created });
}
