const TERMII_KEY = process.env.TERMII_API_KEY!;
const TERMII_BASE = "https://api.ng.termii.com/api/sms/send";

function normalizePhone(phone: string): string {
  // Termii expects MSISDN without "+". Accept "0XXXXXXXXXX" or "+234..." and normalize to "234...".
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
      media: mediaUrl ? { url: mediaUrl, caption: "Your STAMP ticket" } : undefined,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as TermiiResponse;
  if (!data.message_id) {
    throw new Error(`WhatsApp delivery failed: ${data.message ?? "unknown"}`);
  }
  return data;
}

export async function sendSMS(phone: string, message: string): Promise<TermiiResponse> {
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

  return (await res.json()) as TermiiResponse;
}

/**
 * Try WhatsApp, fall back to SMS on any failure.
 * Never let a paying buyer receive nothing.
 */
export async function deliverTicket(
  phone: string,
  message: string,
  qrUrl: string,
): Promise<{ channel: "whatsapp" | "sms"; ok: boolean }> {
  try {
    await sendWhatsApp(phone, message, qrUrl);
    return { channel: "whatsapp", ok: true };
  } catch (err) {
    console.error("[termii] whatsapp failed, falling back to sms", err);
    const smsMessage =
      message +
      `\n\nTicket QR: ${qrUrl}\n(If the link does not open, reply HELP.)`;
    try {
      await sendSMS(phone, smsMessage);
      return { channel: "sms", ok: true };
    } catch (smsErr) {
      console.error("[termii] sms also failed", smsErr);
      return { channel: "sms", ok: false };
    }
  }
}

export function ticketMessage(ticket: {
  eventTitle: string;
  venue: string;
  date: string;
  tierName: string;
  qrUrl: string;
}): string {
  return (
    `🎟 Your STAMP ticket\n\n` +
    `*${ticket.eventTitle}*\n` +
    `📅 ${ticket.date}\n` +
    `📍 ${ticket.venue}\n\n` +
    `Tier: ${ticket.tierName}\n\n` +
    `Show this QR code at the door. One scan only.\n\n` +
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
  return (
    `✅ New ticket sold\n\n` +
    `*${args.eventTitle}*\n` +
    `Tier: ${args.tierName}\n` +
    `Buyer: ${name}\n` +
    `Amount: ₦${args.amount.toLocaleString()}\n\n` +
    `Total sold so far: ${args.totalSold}\n\n` +
    `— STAMP`
  );
}
