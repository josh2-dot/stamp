import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentAdmin, logAdminAction } from "@/lib/admin";
import { invalidateFeeCache } from "@/lib/fee-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  fee_base_kobo: number;
  fee_rate_bps: number;
  note?: string;
}

export async function PATCH(req: NextRequest) {
  const me = await getCurrentAdmin();
  if (!me) {
    // 404, not 401 — non-admins shouldn't even know this route exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (
    !Number.isFinite(body.fee_base_kobo) ||
    body.fee_base_kobo < 0 ||
    !Number.isFinite(body.fee_rate_bps) ||
    body.fee_rate_bps < 0 ||
    body.fee_rate_bps > 10_000
  ) {
    return NextResponse.json(
      { error: "Invalid fee values" },
      { status: 400 },
    );
  }

  const admin = createAdminSupabase();

  // Snapshot current values for the audit log
  const { data: before } = await admin
    .from("platform_config")
    .select("fee_base_kobo, fee_rate_bps")
    .eq("id", 1)
    .single();

  // Skip the write if nothing actually changed — keeps the audit log clean.
  if (
    before &&
    Number(before.fee_base_kobo) === body.fee_base_kobo &&
    Number(before.fee_rate_bps) === body.fee_rate_bps
  ) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const { error: updateErr } = await admin
    .from("platform_config")
    .update({
      fee_base_kobo: body.fee_base_kobo,
      fee_rate_bps: body.fee_rate_bps,
      updated_at: new Date().toISOString(),
      updated_by: me.email,
    })
    .eq("id", 1);

  if (updateErr) {
    console.error("[admin/fees] update failed", updateErr);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }

  // Invalidate the in-memory cache so subsequent fee calculations see
  // the new values immediately (rather than waiting for the TTL).
  invalidateFeeCache();

  // Audit
  await logAdminAction({
    actorEmail: me.email,
    action: "fee_config_update",
    targetType: "platform_config",
    targetId: "1",
    before: before ?? null,
    after: {
      fee_base_kobo: body.fee_base_kobo,
      fee_rate_bps: body.fee_rate_bps,
    },
    note: body.note,
  });

  return NextResponse.json({ ok: true });
}
