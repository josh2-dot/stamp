import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendWhatsApp, sendSMS } from "@/lib/termii";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RevealBody {
  /** Optional explicit winner. If omitted, the highest-voted non-excluded
   *  nominee is selected automatically. */
  winner_nominee_id?: string;
  /** Optional WhatsApp number for the winner. If provided, fires a
   *  notification (best-effort, non-fatal). */
  winner_phone?: string;
  /** Override the default notification message */
  custom_message?: string;
}

/**
 * Reveal a category's winner. Two phase transitions allowed:
 *   - voting_open → revealed (closes voting AND reveals in one shot)
 *   - voting_closed → revealed
 *
 * Records the winner on the category row + sends a WhatsApp/SMS message
 * to the winner if winner_phone was provided.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sb = createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!organizer) {
    return NextResponse.json({ error: "No organizer profile" }, { status: 403 });
  }

  const { data: category } = await admin
    .from("award_categories")
    .select("*, events!inner(organizer_id, title)")
    .eq("id", params.id)
    .maybeSingle();
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ev = Array.isArray(category.events) ? category.events[0] : category.events;
  if ((ev as { organizer_id: string }).organizer_id !== organizer.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (!["voting_open", "voting_closed"].includes(category.phase)) {
    return NextResponse.json(
      {
        error:
          "Can only reveal once voting has opened. Advance the category first.",
      },
      { status: 409 },
    );
  }

  let body: RevealBody = {};
  try {
    body = await req.json();
  } catch {
    // body is optional — empty body uses auto-winner
  }

  // Resolve the winner
  let winnerId: string;
  if (body.winner_nominee_id) {
    const { data: nominee } = await admin
      .from("award_nominees")
      .select("id, category_id, is_excluded")
      .eq("id", body.winner_nominee_id)
      .maybeSingle();
    if (
      !nominee ||
      nominee.category_id !== params.id ||
      nominee.is_excluded
    ) {
      return NextResponse.json(
        { error: "Invalid winner_nominee_id" },
        { status: 400 },
      );
    }
    winnerId = nominee.id;
  } else {
    const { data: top } = await admin
      .from("award_nominees")
      .select("id, votes_count")
      .eq("category_id", params.id)
      .eq("is_excluded", false)
      .order("votes_count", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!top) {
      return NextResponse.json(
        { error: "No eligible nominees to reveal" },
        { status: 409 },
      );
    }
    winnerId = top.id;
  }

  const { error: updErr } = await admin
    .from("award_categories")
    .update({
      phase: "revealed",
      revealed_winner_id: winnerId,
      revealed_at: new Date().toISOString(),
      // Make sure voting_close_at is stamped if we skipped that phase
      voting_close_at: category.voting_close_at ?? new Date().toISOString(),
    })
    .eq("id", params.id);

  if (updErr) {
    console.error("[reveal] update failed", updErr);
    return NextResponse.json({ error: "Couldn't reveal" }, { status: 500 });
  }

  // Pull winner details for the response + notification
  const { data: winner } = await admin
    .from("award_nominees")
    .select("display_name, votes_count, amount_kobo")
    .eq("id", winnerId)
    .single();

  let notified: { channel: "whatsapp" | "sms"; ok: boolean } | null = null;
  if (body.winner_phone) {
    const eventTitle = (ev as { title: string }).title;
    const message =
      body.custom_message ??
      `🏆 Congratulations, ${winner?.display_name ?? "winner"}!\n\n` +
        `You won *${category.label}* at ${eventTitle}.\n\n` +
        `Powered by STAMP`;
    try {
      await sendWhatsApp(body.winner_phone, message);
      notified = { channel: "whatsapp", ok: true };
    } catch {
      try {
        await sendSMS(
          body.winner_phone,
          `Congratulations, ${winner?.display_name ?? "winner"}! You won "${category.label}" at ${eventTitle}. — STAMP`,
        );
        notified = { channel: "sms", ok: true };
      } catch (err) {
        console.error("[reveal] notify winner failed", err);
        notified = { channel: "sms", ok: false };
      }
    }
  }

  return NextResponse.json({
    ok: true,
    winner: {
      id: winnerId,
      display_name: winner?.display_name,
      votes_count: winner?.votes_count,
      amount_kobo: winner?.amount_kobo,
    },
    notified,
  });
}
