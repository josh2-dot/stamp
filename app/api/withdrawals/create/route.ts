import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { initiateTransfer } from "@/lib/paystack";
import { makeReference } from "@/lib/format";
import {
  MIN_WITHDRAWAL_KOBO,
  WITHDRAWAL_AMOUNT_MULTIPLE_KOBO,
} from "@/lib/withdrawal-rules";
import type {
  CreateWithdrawalRequest,
  CreateWithdrawalResponse,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Auth
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // 2. Parse body
  let body: CreateWithdrawalRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const amount = Math.floor(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }
  if (amount < MIN_WITHDRAWAL_KOBO) {
    return NextResponse.json(
      { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL_KOBO / 100}` },
      { status: 400 },
    );
  }
  if (amount % WITHDRAWAL_AMOUNT_MULTIPLE_KOBO !== 0) {
    return NextResponse.json(
      { error: "Amount must be a whole naira value" },
      { status: 400 },
    );
  }

  // 3. Resolve organizer + verify payout setup
  const admin = createAdminSupabase();
  const { data: organizer, error: orgErr } = await admin
    .from("organizers")
    .select("id, paystack_recipient_code, account_name")
    .eq("auth_user_id", user.id)
    .single();

  if (orgErr || !organizer) {
    return NextResponse.json({ error: "No organizer profile" }, { status: 403 });
  }
  if (!organizer.paystack_recipient_code) {
    return NextResponse.json(
      { error: "Add your bank details before withdrawing" },
      { status: 409 },
    );
  }

  // 4. Charge any unbilled awards-module fees before the balance check
  //    so they're reflected in the available balance. This is the moment
  //    STAMP collects its awards revenue — capped at vote revenue per event,
  //    idempotent across calls.
  const { error: chargeErr } = await admin.rpc("charge_awards_module_fees", {
    p_organizer_id: organizer.id,
  });
  if (chargeErr) {
    console.error("[withdraw] awards fee charge failed", chargeErr);
    // Not fatal — the balance check below will simply not deduct
    // any fees that haven't been materialized yet. Worth flagging though.
  }

  // 5. Balance check — atomic with the insert below.
  // We do an explicit RPC check, then insert. There's a tiny race window
  // between the check and the insert if two requests fire simultaneously;
  // since a single organizer doesn't fire concurrent withdrawals in practice,
  // and the worst case is one transfer fails at Paystack with insufficient
  // balance, we accept this trade-off in V1.
  const { data: balanceData, error: balErr } = await admin.rpc(
    "organizer_available_balance",
    { p_organizer_id: organizer.id },
  );

  if (balErr) {
    console.error("[withdraw] balance check failed", balErr);
    return NextResponse.json({ error: "Couldn't verify balance" }, { status: 500 });
  }

  const available = Number(balanceData ?? 0);
  if (amount > available) {
    return NextResponse.json(
      {
        error: `Requested ₦${amount / 100} but only ₦${available / 100} available`,
      },
      { status: 409 },
    );
  }

  // 5. Insert pending withdrawal row first — gives us an ID + reserves the balance.
  // Status moves to otp_required / processing / success on Paystack response.
  const reference = makeReference("WDL");
  const reason = `STAMP settlement to ${organizer.account_name ?? "organizer"}`;

  const { data: withdrawal, error: wdlErr } = await admin
    .from("withdrawals")
    .insert({
      organizer_id: organizer.id,
      amount,
      status: "pending",
      paystack_reference: reference,
    })
    .select("id")
    .single();

  if (wdlErr || !withdrawal) {
    console.error("[withdraw] insert failed", wdlErr);
    return NextResponse.json({ error: "Couldn't create withdrawal" }, { status: 500 });
  }

  // 6. Initiate transfer with Paystack
  try {
    const { status, transferCode } = await initiateTransfer({
      amountKobo: amount,
      recipientCode: organizer.paystack_recipient_code,
      reference,
      reason,
    });

    // Persist the transfer_code so we can finalize / reconcile against webhooks
    const newStatus =
      status === "otp"
        ? "otp_required"
        : status === "success"
        ? "success"
        : "processing";

    await admin
      .from("withdrawals")
      .update({
        paystack_transfer_code: transferCode,
        status: newStatus,
        completed_at: status === "success" ? new Date().toISOString() : null,
      })
      .eq("id", withdrawal.id);

    const payload: CreateWithdrawalResponse =
      newStatus === "otp_required"
        ? {
            status: "otp_required",
            withdrawalId: withdrawal.id,
            message: "Paystack sent an OTP — enter it to finalize.",
          }
        : newStatus === "success"
        ? { status: "success", withdrawalId: withdrawal.id }
        : { status: "processing", withdrawalId: withdrawal.id };

    return NextResponse.json(payload);
  } catch (err) {
    // Mark as failed and roll back the reserved balance
    const message = err instanceof Error ? err.message : "Transfer failed";
    console.error("[withdraw] paystack transfer failed", err);
    await admin
      .from("withdrawals")
      .update({ status: "failed", failure_reason: message })
      .eq("id", withdrawal.id);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
