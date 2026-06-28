/**
 * Build the canonical public URL for a ticket's web page.
 *
 * The `qr_code` UUID doubles as the URL slug — no separate short-code
 * column needed for V1. The secret IS the URL; anyone with the link can
 * see (but not mark used) the ticket. The scanner still requires the
 * event's scanner_secret to actually admit.
 */
export function ticketWebUrl(qrCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/t/${qrCode}`;
}
