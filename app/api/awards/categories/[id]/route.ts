import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  label?: string;
  vote_price_naira?: number;
  nominations_open_at?: string | null;
  nominations_close_at?: string | null;
  voting_open_at?: string | null;
  voting_close_at?: string | null;
  results_public_during_voting?: boolean;
  max_votes_per_voter?: number | null;
  sort_order?: number;
}

async function authorize(categoryId: string) {
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

  const { data: category } = await admin
    .from("award_categories")
    .select("*, events!inner(organizer_id)")
    .eq("id", categoryId)
    .maybeSingle();
  if (!category) return { error: "Category not found", status: 404 } as const;

  const ev = Array.isArray(category.events) ? category.events[0] : category.events;
  if ((ev as { organizer_id: string }).organizer_id !== organizer.id) {
    return { error: "Not allowed", status: 403 } as const;
  }

  return { admin, category };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await authorize(params.id);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  // What edits are allowed depends on phase. In 'draft' anything goes.
  // Once nominations are open we restrict to: timing windows, results
  // visibility, max votes per voter, sort_order. Structural edits (label,
  // price) lock to preserve fairness — voters and nominators saw the
  // original numbers.
  const phase = ctx.category.phase;
  const isStructuralChange = (b: PatchBody) =>
    b.label !== undefined || b.vote_price_naira !== undefined;

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (phase !== "draft" && isStructuralChange(body)) {
    return NextResponse.json(
      { error: "Label and price are locked once nominations open." },
      { status: 409 },
    );
  }

  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = body.label.trim();
  if (body.vote_price_naira !== undefined) {
    update.vote_price_kobo = Math.round(body.vote_price_naira * 100);
  }
  if (body.nominations_open_at !== undefined) {
    update.nominations_open_at = body.nominations_open_at;
  }
  if (body.nominations_close_at !== undefined) {
    update.nominations_close_at = body.nominations_close_at;
  }
  if (body.voting_open_at !== undefined) {
    update.voting_open_at = body.voting_open_at;
  }
  if (body.voting_close_at !== undefined) {
    update.voting_close_at = body.voting_close_at;
  }
  if (body.results_public_during_voting !== undefined) {
    update.results_public_during_voting = body.results_public_during_voting;
  }
  if (body.max_votes_per_voter !== undefined) {
    update.max_votes_per_voter = body.max_votes_per_voter;
  }
  if (body.sort_order !== undefined) update.sort_order = body.sort_order;

  const { data: updated, error: updErr } = await ctx.admin
    .from("award_categories")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (updErr || !updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ category: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await authorize(params.id);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  // Only deletable in draft — once nominations have happened, deleting
  // would erase nominator submissions and we keep an audit trail instead.
  if (ctx.category.phase !== "draft") {
    return NextResponse.json(
      { error: "Can only delete categories in draft phase." },
      { status: 409 },
    );
  }

  const { error: delErr } = await ctx.admin
    .from("award_categories")
    .delete()
    .eq("id", params.id);

  if (delErr) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
