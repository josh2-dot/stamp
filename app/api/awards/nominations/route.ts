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

  // Insert one row at a time so each row's success/failure is independent.
  //
  // Why not upsert? The dedupe index in migration 012 is an *expression*
  // index — unique on (category_id, nominator_phone, lower(trim(nominee_name))).
  // Postgres ON CONFLICT requires the conflict spec to match an actual unique
  // constraint exactly; expression indexes can't be referenced by column name.
  // Supabase's upsert with onConflict: "category_id,nominator_phone,nominee_name"
  // therefore returns "42P10: there is no unique or exclusion constraint
  // matching the ON CONFLICT specification".
  //
  // Per-row insert sidesteps that: we let the unique index do its job at the
  // DB layer, catch error code 23505 (unique_violation) as a duplicate, and
  // treat it as soft-success — the nominator's intent was captured the first
  // time they submitted. Other errors fail loudly with the real Postgres
  // message so they're diagnosable in production.
  const rows = entries.map((e) => ({
    category_id: e.category_id,
    event_id: body.event_id,
    nominee_name: e.nominee_name,
    nominator_phone: phone,
    status: "pending" as const,
  }));

  let inserted = 0;
  let duplicates = 0;

  for (const row of rows) {
    const { error: rowErr } = await admin
      .from("award_nominations")
      .insert(row);

    if (!rowErr) {
      inserted += 1;
      continue;
    }

    // 23505 = unique_violation. The unique index on
    // (category_id, nominator_phone, lower(trim(nominee_name))) caught a
    // dupe — same nominator, same name (case-insensitive), same category.
    // Soft-success: don't surface this as an error to the public form.
    if (rowErr.code === "23505") {
      duplicates += 1;
      continue;
    }

    // Any other error is real. Log with full detail server-side, and send
    // the Postgres message back to the client so the organizer (or me)
    // can actually debug it instead of staring at "Couldn't submit".
    console.error("[nominations] insert failed", {
      code: rowErr.code,
      message: rowErr.message,
      details: rowErr.details,
      hint: rowErr.hint,
      row,
    });
    return NextResponse.json(
      {
        error:
          rowErr.message ||
          "Couldn't submit. The database rejected the nomination.",
        code: rowErr.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    received: entries.length,
    new: inserted,
    duplicates,
  });
}
