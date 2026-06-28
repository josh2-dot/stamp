import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentAdmin, logAdminAction } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  /** Both null = clear the override. Both set = apply/update. */
  fee_base_kobo: number | null;
  fee_rate_bps: number | null;
  note?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const me = await getCurrentAdmin();
  if (!me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  // Validate the "both null OR both set" invariant — same check as the DB
  // constraint, but we want a clean 400 instead of a 500 from a constraint
  // violation.
  const bothNull =
    body.fee_base_kobo === null && body.fee_rate_bps === null;
  const bothSet =
    body.fee_base_kobo !== null && body.fee_rate_bps !== null;
  if (!bothNull && !bothSet) {
    return NextResponse.json(
      { error: "Provide both fee values or both null (to clear)" },
      { status: 400 },
    );
  }

  if (bothSet) {
    if (
      !Number.isFinite(body.fee_base_kobo) ||
      (body.fee_base_kobo as number) < 0 ||
      !Number.isFinite(body.fee_rate_bps) ||
      (body.fee_rate_bps as number) < 0 ||
      (body.fee_rate_bps as number) > 10_000
    ) {
      return NextResponse.json(
        { error: "Invalid fee values" },
        { status: 400 },
      );
    }
  }

  const admin = createAdminSupabase();

  // Snapshot current values for the audit log + change detection
  const { data: before } = await admin
    .from("organizers")
    .select("id, name, custom_fee_base_kobo, custom_fee_rate_bps")
    .eq("id", params.id)
    .maybeSingle();

  if (!before) {
    return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
  }

  const wasOverridden =
    before.custom_fee_base_kobo !== null &&
    before.custom_fee_rate_bps !== null;

  // Skip the write + log if nothing actually changed
  if (bothNull && !wasOverridden) {
    return NextResponse.json({ ok: true, unchanged: true });
  }
  if (
    bothSet &&
    Number(before.custom_fee_base_kobo) === body.fee_base_kobo &&
    Number(before.custom_fee_rate_bps) === body.fee_rate_bps
  ) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const { error: updateErr } = await admin
    .from("organizers")
    .update({
      custom_fee_base_kobo: body.fee_base_kobo,
      custom_fee_rate_bps: body.fee_rate_bps,
    })
    .eq("id", params.id);

  if (updateErr) {
    console.error("[admin/organizers/fee] update failed", updateErr);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }

  await logAdminAction({
    actorEmail: me.email,
    action: bothNull ? "organizer_fee_override_clear" : "organizer_fee_override_set",
    targetType: "organizer",
    targetId: params.id,
    before: {
      name: before.name,
      fee_base_kobo: before.custom_fee_base_kobo,
      fee_rate_bps: before.custom_fee_rate_bps,
    },
    after: {
      name: before.name,
      fee_base_kobo: body.fee_base_kobo,
      fee_rate_bps: body.fee_rate_bps,
    },
    note: body.note,
  });

  return NextResponse.json({ ok: true });
}
