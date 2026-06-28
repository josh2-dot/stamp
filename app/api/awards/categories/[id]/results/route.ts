import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live results for a category.
 *
 * Visibility rules:
 *   - Organizer sees exact vote counts at all phases
 *   - Public sees:
 *       phase=voting_open + results_public_during_voting=true → percentages + ranks
 *       phase=voting_open + results_public_during_voting=false → "Hidden until reveal"
 *       phase=revealed → full counts + winner highlighted
 *       any other phase → no data
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = createAdminSupabase();
  const { data: category } = await admin
    .from("award_categories")
    .select(
      "id, label, phase, results_public_during_voting, revealed_winner_id, event_id, events!inner(organizer_id)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Is the caller the organizer?
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  let isOrganizer = false;
  if (user) {
    const { data: org } = await admin
      .from("organizers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    const ev = Array.isArray(category.events)
      ? category.events[0]
      : category.events;
    if (org && (ev as { organizer_id: string }).organizer_id === org.id) {
      isOrganizer = true;
    }
  }

  const { data: nominees } = await admin
    .from("award_nominees")
    .select("id, display_name, photo_url, votes_count, amount_kobo, is_excluded")
    .eq("category_id", params.id)
    .eq("is_excluded", false)
    .order("votes_count", { ascending: false });

  const list = nominees ?? [];
  const totalVotes = list.reduce((s, n) => s + Number(n.votes_count), 0);

  const showExact = isOrganizer || category.phase === "revealed";
  const showAnyResults =
    showExact ||
    (category.phase === "voting_open" && category.results_public_during_voting);

  if (!showAnyResults) {
    return NextResponse.json({
      phase: category.phase,
      hidden: true,
      total_votes: 0,
      results: list.map((n) => ({
        id: n.id,
        display_name: n.display_name,
        photo_url: n.photo_url,
      })),
    });
  }

  const results = list.map((n) => ({
    id: n.id,
    display_name: n.display_name,
    photo_url: n.photo_url,
    votes_count: showExact ? Number(n.votes_count) : undefined,
    percent:
      totalVotes > 0 ? Math.round((Number(n.votes_count) / totalVotes) * 100) : 0,
    is_winner: category.revealed_winner_id === n.id,
  }));

  return NextResponse.json({
    phase: category.phase,
    hidden: false,
    total_votes: showExact ? totalVotes : undefined,
    revealed_winner_id: category.revealed_winner_id,
    results,
  });
}
