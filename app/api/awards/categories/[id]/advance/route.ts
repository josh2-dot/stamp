import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { nextPhase, type AwardPhase } from "@/lib/awards";
import { notifyOrganizer } from "@/lib/termii";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Advance a category to its next phase. Idempotent at the *target* — if
 * the category is already in the target phase, we return ok. Otherwise
 * the transition must be exactly one step forward.
 *
 * Special phase rules:
 *  - draft → nominations_open: no prerequisites
 *  - nominations_open → moderation: no prerequisites (closes the public form)
 *  - moderation → voting_open: requires at least 2 promoted, non-excluded nominees
 *  - voting_open → voting_closed: no prerequisites
 *  - voting_closed → revealed: requires the organizer to also pick a winner
 *    (handled by a separate /reveal route — this advance only allows the
 *    transition if winner_id has been set)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
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
    return NextResponse.json({ error: "No organizer profile" }, { status: 403 });
  }

  const { data: category } = await admin
    .from("award_categories")
    .select("*, events!inner(organizer_id, slug)")
    .eq("id", params.id)
    .maybeSingle();
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  const ev = Array.isArray(category.events) ? category.events[0] : category.events;
  if ((ev as { organizer_id: string }).organizer_id !== organizer.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const currentPhase = category.phase as AwardPhase;
  const target = nextPhase(currentPhase);
  if (!target) {
    return NextResponse.json(
      { error: "Category is already in its final phase." },
      { status: 409 },
    );
  }

  // Prerequisite: opening voting needs at least 2 nominees on the ballot
  if (target === "voting_open") {
    const { count } = await admin
      .from("award_nominees")
      .select("id", { count: "exact", head: true })
      .eq("category_id", params.id)
      .eq("is_excluded", false);
    if ((count ?? 0) < 2) {
      return NextResponse.json(
        {
          error:
            "Need at least 2 promoted nominees before voting can open. Add more from the nominations panel.",
        },
        { status: 409 },
      );
    }
  }

  // 'revealed' must come through the /reveal endpoint, not this one
  if (target === "revealed") {
    return NextResponse.json(
      {
        error:
          "Use the reveal action to declare a winner — it both transitions phase and notifies them.",
      },
      { status: 409 },
    );
  }

  const update: Record<string, unknown> = { phase: target };
  // Stamp the corresponding timestamp so the organizer's UI can show
  // "nominations have been open for X hours"
  if (target === "nominations_open") update.nominations_open_at = new Date().toISOString();
  if (target === "moderation") update.nominations_close_at = new Date().toISOString();
  if (target === "voting_open") update.voting_open_at = new Date().toISOString();
  if (target === "voting_closed") update.voting_close_at = new Date().toISOString();

  const { error: updErr } = await admin
    .from("award_categories")
    .update(update)
    .eq("id", params.id);

  if (updErr) {
    console.error("[awards advance] update failed", updErr);
    return NextResponse.json({ error: "Couldn't advance" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, phase: target });
}
