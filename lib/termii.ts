import { ticketWebUrl } from "@/lib/ticket-url";

const TERMII_KEY = process.env.TERMII_API_KEY!;
const TERMII_BASE = "https://api.ng.termii.com/api/sms/send";

/**
 * WhatsApp delivery via Termii requires a $50/month WABA subscription per
 * connected device. Until that's justified (~300+ tickets/month per
 * number), we default to SMS-only — Termii's regular SMS channel has no
 * monthly fee, just per-message cost.
 *
 * Set WHATSAPP_ENABLED=true in Vercel to flip WhatsApp on for ticket
 * delivery + organizer notifications. SMS still acts as the automatic
 * fallback when WhatsApp send fails.
 */
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === "true";

function normalizePhone(phone: string): string {
  // Termii expects MSISDN without "+". Accept "0XXXXXXXXXX" or "+234..."
  // and normalize to "234...".
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return digits;
}

interface TermiiResponse {
  message_id?: string;
  message?: string;
  code?: string;
  balance?: number;
}

export async function sendWhatsApp(
  phone: string,
  message: string,
  mediaUrl?: string,
): Promise<TermiiResponse> {
  if (!TERMII_KEY) throw new Error("TERMII_API_KEY is not set");

  const res = await fetch(TERMII_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TERMII_KEY,
      to: normalizePhone(phone),
      from: "STAMP",
      sms: message,
      type: "plain",
      channel: "whatsapp",
      media: mediaUrl
        ? { url: mediaUrl, caption: "Your STAMP ticket" }
        : undefined,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as TermiiResponse;
  if (!data.message_id) {
    throw new Error(`WhatsApp delivery failed: ${data.message ?? "unknown"}`);
  }
  return data;
}

export async function sendSMS(
  phone: string,
  message: string,
): Promise<TermiiResponse> {
  if (!TERMII_KEY) throw new Error("TERMII_API_KEY is not set");

  const res = await fetch(TERMII_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TERMII_KEY,
      to: normalizePhone(phone),
      from: "STAMP",
      sms: message,
      type: "plain",
      channel: "generic",
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as TermiiResponse;
  if (!data.message_id) {
    throw new Error(`SMS delivery failed: ${data.message ?? "unknown"}`);
  }
  return data;
}

/**
 * Deliver a ticket to the buyer.
 *
 * Strategy:
 *  - If WHATSAPP_ENABLED is true, try WhatsApp first (rich preview, QR
 *    image inline). On failure, fall back to SMS.
 *  - Otherwise, SMS direct.
 *
 * Either channel links to the canonical web ticket page so the buyer
 * always has a permanent record — even if WhatsApp fails AND the SMS
 * delivers but they delete it, the URL on the success page still works.
 */
export async function deliverTicket(args: {
  phone: string;
  qrCode: string;
  eventTitle: string;
  venue: string;
  date: string;
  tierName: string;
  qrImageUrl: string;
}): Promise<{ channel: "whatsapp" | "sms"; ok: boolean }> {
  const ticketUrl = ticketWebUrl(args.qrCode);

  if (WHATSAPP_ENABLED) {
    try {
      const whatsappMessage = whatsappTicketMessage({
        eventTitle: args.eventTitle,
        venue: args.venue,
        date: args.date,
        tierName: args.tierName,
        ticketUrl,
      });
      await sendWhatsApp(args.phone, whatsappMessage, args.qrImageUrl);
      return { channel: "whatsapp", ok: true };
    } catch (err) {
      console.error(
        "[termii] whatsapp failed, falling back to sms",
        err,
      );
    }
  }

  // SMS path — short, single message, link does the heavy lifting
  try {
    const smsBody = smsTicketMessage({
      eventTitle: args.eventTitle,
      ticketUrl,
    });
    await sendSMS(args.phone, smsBody);
    return { channel: "sms", ok: true };
  } catch (smsErr) {
    console.error("[termii] sms failed", smsErr);
    return { channel: "sms", ok: false };
  }
}

/**
 * Send an organizer-facing notification. Uses WhatsApp when enabled
 * (cheaper per-message at scale) or SMS otherwise.
 */
export async function notifyOrganizer(
  phone: string,
  message: string,
): Promise<{ channel: "whatsapp" | "sms"; ok: boolean }> {
  if (WHATSAPP_ENABLED) {
    try {
      await sendWhatsApp(phone, message);
      return { channel: "whatsapp", ok: true };
    } catch (err) {
      console.error(
        "[termii] organizer whatsapp failed, falling back to sms",
        err,
      );
    }
  }
  try {
    await sendSMS(phone, message);
    return { channel: "sms", ok: true };
  } catch (err) {
    console.error("[termii] organizer sms failed", err);
    return { channel: "sms", ok: false };
  }
}

// ---- Message templates ----------------------------------------------

/** Truncate to a SMS-safe length while keeping the link readable. */
function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

/**
 * Single-SMS ticket message. Most carriers cap at 160 chars per segment;
 * multi-segment messages cost more, so aim to fit under that.
 *
 * Typical: ~135 chars depending on event title length.
 */
export function smsTicketMessage(args: {
  eventTitle: string;
  ticketUrl: string;
}): string {
  // Reserve ~70 chars for fixed text + URL, give the rest to the title.
  const titleBudget = 160 - 70 - args.ticketUrl.length;
  const title = truncate(args.eventTitle, Math.max(20, titleBudget));
  return `STAMP: your ticket for "${title}" is ready. Open it: ${args.ticketUrl} - Show at the door. One scan only.`;
}

/**
 * Rich WhatsApp message — only used when WHATSAPP_ENABLED is true.
 * Allows markdown-style emphasis Termii's WhatsApp channel renders.
 */
export function whatsappTicketMessage(args: {
  eventTitle: string;
  venue: string;
  date: string;
  tierName: string;
  ticketUrl: string;
}): string {
  return (
    `🎟 Your STAMP ticket\n\n` +
    `*${args.eventTitle}*\n` +
    `📅 ${args.date}\n` +
    `📍 ${args.venue}\n` +
    `Tier: ${args.tierName}\n\n` +
    `Show the QR at the door (one scan only).\n` +
    `Or open your ticket page: ${args.ticketUrl}\n\n` +
    `Powered by STAMP`
  );
}

export function organizerNotification(args: {
  eventTitle: string;
  tierName: string;
  buyerName: string | null;
  amount: number; // naira
  totalSold: number;
}): string {
  const name = args.buyerName ?? "Anonymous buyer";
  // Used by both SMS and WhatsApp paths — keep it readable in plain text,
  // markdown stars work in WhatsApp and degrade harmlessly in SMS.
  return (
    `STAMP: New ticket sold for "${truncate(args.eventTitle, 50)}". ` +
    `${args.tierName} · ${name} · ₦${args.amount.toLocaleString()} · ` +
    `${args.totalSold} sold total.`
  );
}
