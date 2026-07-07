import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { CreateAwardCategoryRequest } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOrganizerAndEvent(eventId: string) {
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Not signed in", status: 401 } as const;

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!organizer) return { error: "No organizer profile", status: 403 } as const;

  const { data: event } = await admin
    .from("events")
    .select("id, slug, title, awards_enabled")
    .eq("id", eventId)
    .eq("organizer_id", organizer.id)
    .maybeSingle();
  if (!event) return { error: "Event not found", status: 404 } as const;

  return { organizer, event, admin };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getOrganizerAndEvent(params.id);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  // Pull categories along with light aggregates the management page needs:
  // raw nomination counts and ballot size. Done as separate queries because
  // a JOIN here would explode the row count.
  const { data: categories } = await ctx.admin
    .from("award_categories")
    .select("*")
    .eq("event_id", params.id)
    .order("sort_order", { ascending: true });

  const ids = (categories ?? []).map((c) => c.id);
  const nominationCount = new Map<string, number>();
  const nomineeCount = new Map<string, number>();
  const voteSum = new Map<string, number>();

  if (ids.length > 0) {
    const { data: nominations } = await ctx.admin
      .from("award_nominations")
      .select("category_id, status")
      .in("category_id", ids);
    for (const n of nominations ?? []) {
      nominationCount.set(n.category_id, (nominationCount.get(n.category_id) ?? 0) + 1);
    }

    const { data: nominees } = await ctx.admin
      .from("award_nominees")
      .select("category_id, votes_count, amount_kobo, is_excluded")
      .in("category_id", ids);
    for (const n of nominees ?? []) {
      if (!n.is_excluded) {
        nomineeCount.set(n.category_id, (nomineeCount.get(n.category_id) ?? 0) + 1);
      }
      voteSum.set(
        n.category_id,
        (voteSum.get(n.category_id) ?? 0) + Number(n.amount_kobo ?? 0),
      );
    }
  }

  const enriched = (categories ?? []).map((c) => ({
    ...c,
    nominations_count: nominationCount.get(c.id) ?? 0,
    nominees_count: nomineeCount.get(c.id) ?? 0,
    vote_revenue_kobo: voteSum.get(c.id) ?? 0,
  }));

  return NextResponse.json({
    awards_enabled: ctx.event.awards_enabled,
    categories: enriched,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getOrganizerAndEvent(params.id);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: CreateAwardCategoryRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!body.label?.trim()) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  // Vote price. Two modes:
  //   - Paid: any amount ≥ ₦50 (Paystack's practical floor for card
  //     transactions; below this, transaction fees eat the vote)
  //   - Free: exactly ₦0 — treated as an unmonetized poll. In this mode
  //     we default max_votes_per_voter to 1 to prevent one person from
  //     stuffing the ballot, though the organizer can override.
  const votePriceKobo = body.vote_price_naira != null
    ? Math.round(body.vote_price_naira * 100)
    : 10000;
  const isFree = votePriceKobo === 0;
  if (!isFree && votePriceKobo < 5000) {
    return NextResponse.json(
      { error: "Vote price must be ₦0 (free poll) or at least ₦50" },
      { status: 400 },
    );
  }

  // Free-poll default: 1 vote per phone. Prevents obvious abuse without
  // taking the choice away from the organizer, who can set a higher cap
  // (or no cap) explicitly if they want.
  const maxPerVoter = body.max_votes_per_voter !== undefined
    ? body.max_votes_per_voter
    : isFree
      ? 1
      : null;

  // Determine sort order — append to end by default
  let sortOrder = body.sort_order ?? 0;
  if (body.sort_order === undefined) {
    const { data: last } = await ctx.admin
      .from("award_categories")
      .select("sort_order")
      .eq("event_id", params.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (last?.sort_order ?? -1) + 1;
  }

  const { data: created, error: insertErr } = await ctx.admin
    .from("award_categories")
    .insert({
      event_id: params.id,
      label: body.label.trim(),
      vote_price_kobo: votePriceKobo,
      nominations_open_at: body.nominations_open_at ?? null,
      nominations_close_at: body.nominations_close_at ?? null,
      voting_open_at: body.voting_open_at ?? null,
      voting_close_at: body.voting_close_at ?? null,
      results_public_during_voting: body.results_public_during_voting ?? false,
      max_votes_per_voter: maxPerVoter,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (insertErr || !created) {
    console.error("[awards/categories POST] insert failed", insertErr);
    return NextResponse.json({ error: "Couldn't create" }, { status: 500 });
  }

  // First category created → flip awards_enabled on the event so the
  // public /[slug] page knows to render the voting section.
  if (!ctx.event.awards_enabled) {
    await ctx.admin
      .from("events")
      .update({ awards_enabled: true })
      .eq("id", params.id);
  }

  return NextResponse.json({ category: created });
}
