import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  display_name?: string;
  description?: string | null;
  photo_url?: string | null;
  is_excluded?: boolean;
  sort_order?: number;
}

export async function PATCH(
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

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
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

  const { data: nominee } = await admin
    .from("award_nominees")
    .select(
      "*, award_categories!inner(phase), events!inner(organizer_id)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!nominee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ev = Array.isArray(nominee.events) ? nominee.events[0] : nominee.events;
  if ((ev as { organizer_id: string }).organizer_id !== organizer.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const cat = Array.isArray(nominee.award_categories)
    ? nominee.award_categories[0]
    : nominee.award_categories;
  const phase = (cat as { phase: string }).phase;

  // Once voting opens, fairness rules apply:
  //   - Can still edit display_name (typo fixes, etc.)
  //   - Can still exclude (cheating discovered)
  //   - Can still reorder
  //   - Description + photo also fine
  // No path-level restrictions for V1; the organizer's reputation is on
  // the line and these are correctly within their authority.

  const update: Record<string, unknown> = {};
  if (body.display_name !== undefined) update.display_name = body.display_name.trim();
  if (body.description !== undefined) update.description = body.description;
  if (body.photo_url !== undefined) update.photo_url = body.photo_url;
  if (body.is_excluded !== undefined) update.is_excluded = body.is_excluded;
  if (body.sort_order !== undefined) update.sort_order = body.sort_order;

  // Refuse to exclude a nominee mid-vote if they're the current leader —
  // looks like cheating. Force the organizer to acknowledge via a
  // separate confirm step (not built for V1; just block).
  if (body.is_excluded === true && phase === "voting_open") {
    const { data: top } = await admin
      .from("award_nominees")
      .select("id, votes_count")
      .eq("category_id", (nominee as { category_id: string }).category_id)
      .eq("is_excluded", false)
      .order("votes_count", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (top?.id === params.id) {
      return NextResponse.json(
        {
          error:
            "This nominee is currently leading. To exclude mid-vote, close voting first.",
        },
        { status: 409 },
      );
    }
  }

  const { data: updated, error: updErr } = await admin
    .from("award_nominees")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (updErr || !updated) {
    console.error("[nominee PATCH] update failed", updErr);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ nominee: updated });
}
