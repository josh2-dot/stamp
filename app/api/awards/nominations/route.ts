import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeNgPhone } from "@/lib/awards";
import type { SubmitNominationsRequest } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public nomination submission. No auth — just a phone number (not
 * verified, just captured for accountability). Accepts multiple
 * nominations in one POST so the public form can submit all categories
 * the visitor filled out in a single click.
 *
 * Validation:
 *  - Phone normalizes to a Nigerian E.164 number
 *  - Each nomination targets a category that's currently in
 *    `nominations_open` phase
 *  - Each nominee name is 2-60 chars
 *  - Per-category dedupe (DB-level unique index on
 *    category_id + nominator_phone + lower(trim(nominee_name)))
 *
 * Duplicate submissions for the same name in the same category by the
 * same nominator silently succeed (counted once at the DB layer).
 */
export async function POST(req: NextRequest) {
  let body: SubmitNominationsRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!body.event_id || !body.nominator_phone || !Array.isArray(body.nominations)) {
    return NextResponse.json(
      { error: "event_id, nominator_phone, and nominations are required" },
      { status: 400 },
    );
  }

  const phone = normalizeNgPhone(body.nominator_phone);
  if (!phone) {
    return NextResponse.json(
      { error: "Invalid Nigerian phone number" },
      { status: 400 },
    );
  }

  // Filter empties — the form lets users skip categories by leaving the
  // field blank, so we drop those before validating.
  const entries = body.nominations
    .map((n) => ({
      category_id: n.category_id,
      nominee_name: n.nominee_name?.trim() ?? "",
    }))
    .filter((n) => n.category_id && n.nominee_name.length >= 2);

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "Add at least one nomination." },
      { status: 400 },
    );
  }

  for (const e of entries) {
    if (e.nominee_name.length > 60) {
      return NextResponse.json(
        { error: `Name too long: "${e.nominee_name.slice(0, 30)}..."` },
        { status: 400 },
      );
    }
  }

  const admin = createAdminSupabase();

  // Verify every targeted category exists, belongs to this event, and is
  // currently accepting nominations. One round trip.
  const categoryIds = Array.from(new Set(entries.map((e) => e.category_id)));
  const { data: cats } = await admin
    .from("award_categories")
    .select("id, event_id, phase, label")
    .in("id", categoryIds);

  const catMap = new Map((cats ?? []).map((c) => [c.id, c]));
  for (const e of entries) {
    const cat = catMap.get(e.category_id);
    if (!cat || cat.event_id !== body.event_id) {
      return NextResponse.json(
        { error: "One of the categories doesn't belong to this event." },
        { status: 400 },
      );
    }
    if (cat.phase !== "nominations_open") {
      return NextResponse.json(
        { error: `Nominations are closed for "${cat.label}".` },
        { status: 409 },
      );
    }
  }

  // Insert. Use upsert-on-conflict-do-nothing so dupe nominations from the
  // same nominator don't error out — they silently succeed.
  const rows = entries.map((e) => ({
    category_id: e.category_id,
    event_id: body.event_id,
    nominee_name: e.nominee_name,
    nominator_phone: phone,
    status: "pending" as const,
  }));

  const { error: insertErr, count } = await admin
    .from("award_nominations")
    .upsert(rows, {
      onConflict: "category_id,nominator_phone,nominee_name",
      ignoreDuplicates: true,
      count: "exact",
    });

  if (insertErr) {
    console.error("[nominations] insert failed", insertErr);
    return NextResponse.json({ error: "Couldn't submit" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    received: entries.length,
    new: count ?? entries.length,
  });
}
