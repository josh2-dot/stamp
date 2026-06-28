import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { verifyTransaction, verifyWebhookSignature } from "@/lib/paystack";
import { generateQR } from "@/lib/qr";
import { uploadQRToSupabase } from "@/lib/storage";
import {
  deliverTicket,
  notifyOrganizer,
  organizerNotification,
} from "@/lib/termii";
import { sendEmail, buildTicketEmailHtml } from "@/lib/email";
import { ticketWebUrl } from "@/lib/ticket-url";
import { koboToNaira } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PaystackWebhookEvent {
  event: string;
  data: {
    reference?: string;
    transfer_code?: string;
    amount?: number;
    status?: string;
    failures?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
}

export async function POST(req: NextRequest) {
  // 1. Read raw body for HMAC verification — must be done before any JSON parse logic
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[paystack-webhook] invalid signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return new NextResponse("Malformed body", { status: 400 });
  }

  // Route by event type
  switch (event.event) {
    case "charge.success":
      return handleChargeSuccess(event);
    case "transfer.success":
      return handleTransferStatus(event, "success");
    case "transfer.failed":
      return handleTransferStatus(event, "failed");
    case "transfer.reversed":
      return handleTransferStatus(event, "reversed");
    default:
      return NextResponse.json({ ok: true, ignored: event.event });
  }
}

// ============================================================
// Charge handling (buyer paid → issue ticket)
// ============================================================

async function handleChargeSuccess(event: PaystackWebhookEvent) {
  const reference = event.data.reference;
  if (!reference) {
    return NextResponse.json({ ok: false, reason: "no_reference" });
  }

  try {
    // Re-verify with Paystack as defense in depth
    const verification = await verifyTransaction(reference);
    if (!verification.status || verification.data.status !== "success") {
      console.warn("[paystack-webhook] verification failed", reference);
      return NextResponse.json({ ok: false, reason: "verification_failed" });
    }

    const supabase = createAdminSupabase();

    // 3. Load the pending ticket + tier + event + organizer in one go
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select(
        `id, status, buyer_phone, buyer_name, buyer_email, event_id, tier_id, amount_paid,
         qr_code, ticket_tiers!inner(id, name, price),
         events!inner(id, title, venue, event_date,
           organizers!inner(id, phone, name))`,
      )
      .eq("paystack_ref", reference)
      .single();

    if (ticketErr || !ticket) {
      console.error("[paystack-webhook] ticket not found", reference, ticketErr);
      return NextResponse.json({ ok: false, reason: "ticket_not_found" });
    }

    // Idempotency: webhook may fire more than once
    if (ticket.status === "paid") {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    // Normalize nested joins
    const tier = Array.isArray(ticket.ticket_tiers) ? ticket.ticket_tiers[0] : ticket.ticket_tiers;
    const ev = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
    const organizer = ev && (Array.isArray(ev.organizers) ? ev.organizers[0] : ev.organizers);

    if (!tier || !ev || !organizer) {
      console.error("[paystack-webhook] missing joins", { tier, ev, organizer });
      return NextResponse.json({ ok: false, reason: "data_integrity" });
    }

    // 4. Atomically increment sold count. Fails if oversold.
    const { error: incErr } = await supabase.rpc("increment_tier_sold", {
      p_tier_id: tier.id,
    });
    if (incErr) {
      // Oversold — refund flow would go here. For V1 we mark the ticket failed.
      console.error("[paystack-webhook] sold-out at webhook time", reference, incErr);
      await supabase.from("tickets").update({ status: "failed" }).eq("id", ticket.id);
      return NextResponse.json({ ok: false, reason: "oversold" });
    }

    // 5. Generate QR + upload to storage
    const qrBuffer = await generateQR(ticket.qr_code);
    const qrUrl = await uploadQRToSupabase(ticket.id, qrBuffer);

    // 6. Mark ticket paid
    const { error: updateErr } = await supabase
      .from("tickets")
      .update({ status: "paid", qr_image_url: qrUrl })
      .eq("id", ticket.id);

    if (updateErr) {
      console.error("[paystack-webhook] ticket update failed", updateErr);
    }

    // 7. Persist transaction
    await supabase.from("transactions").insert({
      ticket_id: ticket.id,
      paystack_ref: reference,
      amount: verification.data.amount,
      status: "success",
      raw_payload: verification.data as unknown as object,
    });

    // 8. Deliver ticket — multi-channel.
    //    - SMS (always) with link to the canonical web ticket page.
    //    - Email (if buyer provided one) with embedded QR + link.
    //    - WhatsApp (only when WHATSAPP_ENABLED) — falls back to SMS,
    //      which we've already sent, so failure is a no-op.
    const dateStr = new Date(ev.event_date).toLocaleString("en-NG", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    });
    const ticketUrl = ticketWebUrl(ticket.qr_code);

    const delivery = await deliverTicket({
      phone: ticket.buyer_phone,
      qrCode: ticket.qr_code,
      eventTitle: ev.title,
      venue: ev.venue,
      date: dateStr,
      tierName: tier.name,
      qrImageUrl: qrUrl,
    });
    if (!delivery.ok) {
      console.error(
        "[paystack-webhook] sms delivery failed",
        ticket.id,
        delivery,
      );
      // Not fatal — buyer can still access ticket via the success page
      // URL or directly via the web ticket page if they have the link.
    }

    if (ticket.buyer_email) {
      const emailResult = await sendEmail({
        to: ticket.buyer_email,
        subject: `Your STAMP ticket — ${ev.title}`,
        html: buildTicketEmailHtml({
          eventTitle: ev.title,
          venue: ev.venue,
          date: dateStr,
          tierName: tier.name,
          buyerName: ticket.buyer_name,
          qrImageUrl: qrUrl,
          ticketUrl,
        }),
      });
      if (!emailResult.ok && !emailResult.skipped) {
        console.error(
          "[paystack-webhook] email delivery failed",
          ticket.id,
          emailResult.error,
        );
      }
    }

    // 9. Notify organizer (best-effort)
    try {
      // Get the running total for this event to include in the notification
      const { count: totalSold } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", ev.id)
        .eq("status", "paid");

      await notifyOrganizer(
        organizer.phone,
        organizerNotification({
          eventTitle: ev.title,
          tierName: tier.name,
          buyerName: ticket.buyer_name,
          amount: koboToNaira(tier.price),
          totalSold: totalSold ?? 0,
        }),
      );
    } catch (err) {
      console.error("[paystack-webhook] organizer notify failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[paystack-webhook] unhandled", err);
    // Return 200 so Paystack doesn't retry forever on our internal bugs;
    // we have the transaction record and can reconcile manually.
    return NextResponse.json({ ok: false, reason: "handler_error" });
  }
}

// ============================================================
// Transfer handling (payout to organizer)
// ============================================================

async function handleTransferStatus(
  event: PaystackWebhookEvent,
  outcome: "success" | "failed" | "reversed",
) {
  const transferCode = event.data.transfer_code;
  const reference = event.data.reference;
  const failureReason =
    event.data.failures || event.data.reason || null;

  if (!transferCode && !reference) {
    return NextResponse.json({ ok: false, reason: "no_identifier" });
  }

  const supabase = createAdminSupabase();

  // Find the withdrawal by transfer_code first, fall back to reference
  let query = supabase
    .from("withdrawals")
    .select("id, organizer_id, status, amount, organizers!inner(phone, name)")
    .limit(1);

  query = transferCode
    ? query.eq("paystack_transfer_code", transferCode)
    : query.eq("paystack_reference", reference!);

  const { data: withdrawal, error } = await query.maybeSingle();
  if (error || !withdrawal) {
    console.warn("[paystack-webhook] transfer event for unknown withdrawal", {
      transferCode,
      reference,
    });
    // Return 200 — we don't want Paystack to retry this forever
    return NextResponse.json({ ok: false, reason: "not_found" });
  }

  // Idempotency — already in a terminal state
  if (["success", "failed", "reversed"].includes(withdrawal.status)) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const completedAt =
    outcome === "success" ? new Date().toISOString() : null;

  const { error: updateErr } = await supabase
    .from("withdrawals")
    .update({
      status: outcome,
      completed_at: completedAt,
      failure_reason: outcome === "failed" ? failureReason : null,
      raw_payload: event.data as unknown as object,
    })
    .eq("id", withdrawal.id);

  if (updateErr) {
    console.error("[paystack-webhook] withdrawal update failed", updateErr);
    return NextResponse.json({ ok: false, reason: "update_failed" });
  }

  // Notify the organizer via WhatsApp
  const org = Array.isArray(withdrawal.organizers)
    ? withdrawal.organizers[0]
    : withdrawal.organizers;

  if (org?.phone && !org.phone.startsWith("PENDING_")) {
    try {
      const naira = koboToNaira(withdrawal.amount);
      const message =
        outcome === "success"
          ? `✅ Payout settled\n\n₦${naira.toLocaleString()} has hit your bank account.\n\nThanks for using STAMP.`
          : outcome === "failed"
          ? `⚠️ Payout failed\n\nYour ₦${naira.toLocaleString()} withdrawal could not be completed.${failureReason ? `\n\nReason: ${failureReason}` : ""}\n\nThe amount is back in your STAMP balance — try again from the dashboard.`
          : `↩️ Payout reversed\n\nYour ₦${naira.toLocaleString()} payout was reversed by the bank.${failureReason ? `\n\nReason: ${failureReason}` : ""}\n\nThe amount has been restored to your STAMP balance.`;

      await notifyOrganizer(org.phone, message);
    } catch (err) {
      console.error("[paystack-webhook] transfer notify failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
