import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public endpoint: list a public event's award categories along with
 * each category's current phase and (where applicable) the ballot nominees.
 *
 * Used by:
 *   - /[slug]/nominate — shows categories currently in nominations_open
 *   - /[slug]/awards — voting page, shows categories in voting_open / revealed
 *
 * No auth. The data exposed here is what we'd be happy to show any anon
 * visitor (the buyer in a checkout flow already sees the event details).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const admin = createAdminSupabase();

  const { data: event } = await admin
    .from("events")
    .select("id, slug, title, venue, event_date, awards_enabled, is_active")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!event || !event.is_active) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!event.awards_enabled) {
    return NextResponse.json({
      event,
      categories: [],
      nominees_by_category: {},
    });
  }

  const { data: categories } = await admin
    .from("award_categories")
    .select(
      "id, label, vote_price_kobo, phase, nominations_open_at, nominations_close_at, voting_open_at, voting_close_at, results_public_during_voting, max_votes_per_voter, sort_order, revealed_winner_id",
    )
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  // Nominees for any category currently in voting_open or revealed
  const votingOrRevealed = (categories ?? []).filter((c) =>
    ["voting_open", "voting_closed", "revealed"].includes(c.phase),
  );

  const nomineesByCategory: Record<
    string,
    Array<{
      id: string;
      display_name: string;
      description: string | null;
      photo_url: string | null;
      sort_order: number;
    }>
  > = {};

  if (votingOrRevealed.length > 0) {
    const catIds = votingOrRevealed.map((c) => c.id);
    const { data: nominees } = await admin
      .from("award_nominees")
      .select("id, category_id, display_name, description, photo_url, sort_order")
      .in("category_id", catIds)
      .eq("is_excluded", false)
      .order("sort_order", { ascending: true });

    for (const n of nominees ?? []) {
      const existing = nomineesByCategory[n.category_id];
      if (!existing) {
        nomineesByCategory[n.category_id] = [{
          id: n.id,
          display_name: n.display_name,
          description: n.description,
          photo_url: n.photo_url,
          sort_order: n.sort_order,
        }];
      } else {
        existing.push({
          id: n.id,
          display_name: n.display_name,
          description: n.description,
          photo_url: n.photo_url,
          sort_order: n.sort_order,
        });
      }
    }
  }

  return NextResponse.json({
    event,
    categories: categories ?? [],
    nominees_by_category: nomineesByCategory,
  });
}
