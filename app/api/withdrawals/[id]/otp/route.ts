import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { finalizeTransfer } from "@/lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  otp: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const otp = (body.otp || "").replace(/\s+/g, "");
  if (!otp || otp.length < 4) {
    return NextResponse.json({ error: "Enter the OTP" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!organizer) {
    return NextResponse.json({ error: "No profile" }, { status: 403 });
  }

  const { data: withdrawal, error: wdlErr } = await admin
    .from("withdrawals")
    .select("id, status, paystack_transfer_code, organizer_id")
    .eq("id", params.id)
    .eq("organizer_id", organizer.id)
    .maybeSingle();

  if (wdlErr || !withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }
  if (withdrawal.status !== "otp_required") {
    return NextResponse.json(
      { error: `Withdrawal is ${withdrawal.status}, no OTP needed` },
      { status: 409 },
    );
  }
  if (!withdrawal.paystack_transfer_code) {
    return NextResponse.json(
      { error: "Missing Paystack transfer code" },
      { status: 500 },
    );
  }

  try {
    const { status } = await finalizeTransfer(
      withdrawal.paystack_transfer_code,
      otp,
    );

    const newStatus =
      status === "success"
        ? "success"
        : status === "failed"
        ? "failed"
        : "processing";

    await admin
      .from("withdrawals")
      .update({
        status: newStatus,
        completed_at: status === "success" ? new Date().toISOString() : null,
      })
      .eq("id", withdrawal.id);

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OTP rejected";
    // Don't mark the withdrawal as failed — wrong OTP is recoverable
    // (Paystack typically allows retries). The status stays otp_required.
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
