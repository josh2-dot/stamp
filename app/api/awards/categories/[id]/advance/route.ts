import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { nextPhase, type AwardPhase } from "@/lib/awards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdvanceBody {
  /**
   * Optional target phase. If omitted, we advance one step via nextPhase().
   * Passing a target explicitly enables organizer shortcuts:
   *   - draft → voting_open        (skip public nominations entirely)
   *   - nominations_open → voting_open  (close nominations + skip moderation)
   *   - moderation → voting_open   (same as default, still requires ≥2 nominees)
   * All shortcuts still require ≥2 non-excluded nominees on the ballot.
   * Only forward transitions are allowed; the target must sit later in the
   * phase order than the current phase.
   */
  target_phase?: AwardPhase;
}

const PHASE_ORDER: AwardPhase[] = [
  "draft",
  "nominations_open",
  "moderation",
  "voting_open",
  "voting_closed",
  "revealed",
];

/**
 * Advance a category forward through its lifecycle.
 *
 * Default (no body / no target_phase): advance one step via nextPhase().
 * With target_phase: jump directly to a later phase, subject to the
 * prerequisites for that phase (mainly ≥2 nominees for voting_open).
 *
 * This enables the "organizer skips public nominations" flow — they add
 * nominees directly via POST /api/awards/categories/[id]/nominees, then
 * jump straight from draft to voting_open.
 *
 * Phase-specific rules:
 *  - voting_open: requires ≥2 promoted, non-excluded nominees
 *  - revealed:    blocked here — must come through the /reveal endpoint
 *    (which also picks a winner and fires the notification)
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

  // Body is optional — a bare POST advances one step, same as before
  let body: AdvanceBody = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    // No body / malformed — treat as bare advance
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
  const requested = body.target_phase;
  const target: AwardPhase | null = requested ?? nextPhase(currentPhase);

  if (!target) {
    return NextResponse.json(
      { error: "Category is already in its final phase." },
      { status: 409 },
    );
  }

  // Forward-only guard — target must sit later in the ordered lifecycle
  // than the current phase. Rewinding a phase would let an organizer
  // reopen nominations after moderation, which would break invariants
  // (raw nominations they'd rejected could come back in).
  const curIdx = PHASE_ORDER.indexOf(currentPhase);
  const tgtIdx = PHASE_ORDER.indexOf(target);
  if (tgtIdx <= curIdx) {
    return NextResponse.json(
      { error: "Phases only move forward." },
      { status: 409 },
    );
  }

  // Prerequisite: opening voting needs at least 2 nominees on the ballot.
  // Wording adapted based on how the organizer got here — if they came
  // through moderation, mention the nominations panel; otherwise mention
  // adding directly.
  if (target === "voting_open") {
    const { count } = await admin
      .from("award_nominees")
      .select("id", { count: "exact", head: true })
      .eq("category_id", params.id)
      .eq("is_excluded", false);
    if ((count ?? 0) < 2) {
      const wentThroughModeration = currentPhase === "moderation";
      return NextResponse.json(
        {
          error: wentThroughModeration
            ? "Need at least 2 promoted nominees before voting can open. Add more from the nominations panel."
            : "Need at least 2 nominees on the ballot before voting can open. Add nominees first.",
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
  const nowIso = new Date().toISOString();

  // Stamp timestamps for every phase we pass through. If the organizer
  // skipped moderation, we still stamp nominations_close_at so the audit
  // trail shows when the door effectively closed for public input.
  if (tgtIdx >= PHASE_ORDER.indexOf("nominations_open") && !category.nominations_open_at) {
    update.nominations_open_at = nowIso;
  }
  if (tgtIdx >= PHASE_ORDER.indexOf("moderation") && !category.nominations_close_at) {
    update.nominations_close_at = nowIso;
  }
  if (tgtIdx >= PHASE_ORDER.indexOf("voting_open") && !category.voting_open_at) {
    update.voting_open_at = nowIso;
  }
  if (tgtIdx >= PHASE_ORDER.indexOf("voting_closed") && !category.voting_close_at) {
    update.voting_close_at = nowIso;
  }

  const { error: updErr } = await admin
    .from("award_categories")
    .update(update)
    .eq("id", params.id);

  if (updErr) {
    console.error("[awards advance] update failed", updErr);
    return NextResponse.json(
      { error: updErr.message || "Couldn't advance" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, phase: target, skipped: tgtIdx - curIdx > 1 });
}
