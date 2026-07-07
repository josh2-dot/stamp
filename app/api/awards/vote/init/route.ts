import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack";
import { makeReference } from "@/lib/format";
import { normalizeNgPhone, awardsVoteCallbackUrl } from "@/lib/awards";
import type {
  InitAwardVoteRequest,
  InitAwardVoteResponse,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Initialize a vote checkout. Validates the target nominee, computes
 * the price (vote_price * quantity), creates a pending award_votes row,
 * and inits a Paystack transaction. Voter is redirected to Paystack;
 * webhook finalizes on payment confirmation.
 *
 * Money flows 100% to the organizer — no per-vote STAMP cut. STAMP
 * collects the flat awards-module fee at withdrawal time.
 */
export async function POST(req: NextRequest) {
  let body: InitAwardVoteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!body.nominee_id || !body.voter_phone || !body.quantity) {
    return NextResponse.json(
      { error: "nominee_id, voter_phone, and quantity are required" },
      { status: 400 },
    );
  }

  const quantity = Math.floor(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 500) {
    return NextResponse.json(
      { error: "Quantity must be between 1 and 500." },
      { status: 400 },
    );
  }

  const voterPhone = normalizeNgPhone(body.voter_phone);
  if (!voterPhone) {
    return NextResponse.json(
      { error: "Invalid Nigerian phone number" },
      { status: 400 },
    );
  }

  const admin = createAdminSupabase();

  const { data: nominee } = await admin
    .from("award_nominees")
    .select(
      "id, category_id, event_id, display_name, is_excluded, award_categories!inner(phase, vote_price_kobo, max_votes_per_voter, label), events!inner(slug, is_active)",
    )
    .eq("id", body.nominee_id)
    .maybeSingle();

  if (!nominee || nominee.is_excluded) {
    return NextResponse.json({ error: "Nominee not found" }, { status: 404 });
  }

  const cat = Array.isArray(nominee.award_categories)
    ? nominee.award_categories[0]
    : nominee.award_categories;
  const ev = Array.isArray(nominee.events) ? nominee.events[0] : nominee.events;
  const phase = (cat as { phase: string }).phase;
  const votePriceKobo = Number(
    (cat as { vote_price_kobo: number }).vote_price_kobo,
  );
  const maxPerVoter = (
    cat as { max_votes_per_voter: number | null }
  ).max_votes_per_voter;
  const slug = (ev as { slug: string }).slug;
  const isActive = (ev as { is_active: boolean }).is_active;

  if (!isActive) {
    return NextResponse.json({ error: "Event isn't active" }, { status: 410 });
  }
  if (phase !== "voting_open") {
    return NextResponse.json(
      { error: "Voting isn't open for this category yet." },
      { status: 409 },
    );
  }

  // Per-voter cap if the organizer set one
  if (maxPerVoter !== null && maxPerVoter > 0) {
    const { data: existing } = await admin
      .from("award_votes")
      .select("quantity")
      .eq("category_id", nominee.category_id)
      .eq("voter_phone", voterPhone)
      .eq("status", "paid");
    const used = (existing ?? []).reduce(
      (s, v) => s + Number(v.quantity),
      0,
    );
    if (used + quantity > maxPerVoter) {
      return NextResponse.json(
        {
          error: `You've already voted ${used} time(s) in this category. Cap is ${maxPerVoter}.`,
        },
        { status: 409 },
      );
    }
  }

  const isFreeVote = votePriceKobo === 0;
  const amountKobo = votePriceKobo * quantity;
  const ref = `VOTE-${makeReference()}`;

  // Insert vote row. Status differs by mode:
  //   - paid vote → pending, flipped by webhook after Paystack confirms
  //   - free vote → paid immediately, no Paystack round-trip needed
  const { data: vote, error: insertErr } = await admin
    .from("award_votes")
    .insert({
      nominee_id: nominee.id,
      category_id: nominee.category_id,
      event_id: nominee.event_id,
      voter_phone: voterPhone,
      voter_name: body.voter_name?.trim() || null,
      voter_email: body.voter_email?.trim() || null,
      quantity,
      paystack_ref: ref,
      amount_paid: amountKobo,
      status: isFreeVote ? "paid" : "pending",
      paid_at: isFreeVote ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertErr || !vote) {
    console.error("[vote/init] insert failed", insertErr);
    return NextResponse.json(
      { error: insertErr?.message || "Couldn't record vote" },
      { status: 500 },
    );
  }

  // Free-vote fast path: no Paystack, no callback URL, just update the
  // nominee's cached counters and return a confirmation flag so the
  // client can render the "vote counted" state without a redirect.
  if (isFreeVote) {
    // Recount to keep the denormalized counters in sync — same RPC the
    // webhook calls for paid votes, so both paths converge on identical
    // state.
    const { error: recountErr } = await admin.rpc("recount_nominee_votes", {
      p_nominee_id: nominee.id,
    });
    if (recountErr) {
      console.error("[vote/init] recount failed after free vote", recountErr);
      // Non-fatal — the counter will drift briefly but the vote is recorded.
    }
    return NextResponse.json({
      free: true,
      reference: ref,
      // No authorizationUrl — the client detects `free: true` and shows
      // an inline success state instead of redirecting.
    });
  }

  // Paid path — Paystack init. Synthesize an email from the phone if the
  // voter didn't supply one.
  const email =
    body.voter_email?.trim() ||
    `${voterPhone.replace(/\D/g, "")}@voters.stamptickets.ng`;
  const callbackUrl = awardsVoteCallbackUrl(slug, ref);

  const init = await initializeTransaction({
    email,
    amount: amountKobo,
    reference: ref,
    metadata: {
      type: "award_vote",
      vote_id: vote.id,
      nominee_id: nominee.id,
      category_id: nominee.category_id,
      event_id: nominee.event_id,
      voter_phone: voterPhone,
      quantity,
    },
    callbackUrl,
  });

  if (!init.status) {
    console.error("[vote/init] paystack init failed", init);
    return NextResponse.json(
      { error: init.message || "Couldn't start payment" },
      { status: 502 },
    );
  }

  const payload: InitAwardVoteResponse = {
    authorizationUrl: init.data.authorization_url,
    reference: init.data.reference,
  };
  return NextResponse.json(payload);
}
