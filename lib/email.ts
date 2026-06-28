import "server-only";

/**
 * Transactional email via Resend. Used for ticket delivery to buyers who
 * provide an email at checkout. WhatsApp + SMS already cover the buyers
 * who don't — email is belt-and-suspenders for those who do.
 *
 * Free tier: 100/day, 3000/month — well above STAMP's current scale.
 * Auth emails (magic links) go through Supabase + Resend SMTP separately;
 * this lib is for app-level sends.
 *
 * Uses fetch rather than the `resend` npm package to avoid a dep for
 * what amounts to one HTTP POST.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM =
  process.env.RESEND_FROM_EMAIL ?? "STAMP <tickets@stamptickets.ng>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    // Not configured = silently skip. SMS path still delivers the ticket.
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Resend send failed", res.status, text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] fetch threw", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Render the buyer's ticket-delivery email body. Inline styles only —
 * email clients strip stylesheets and ignore `class`. Keep it boring,
 * dark-on-light (Gmail's reading pane is light by default).
 */
export function buildTicketEmailHtml(args: {
  eventTitle: string;
  venue: string;
  date: string;
  tierName: string;
  buyerName: string | null;
  qrImageUrl: string;
  ticketUrl: string;
}): string {
  const name = args.buyerName ?? "Ticket holder";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a2e;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#6b6b8a;">Your STAMP ticket</p>
        <h1 style="margin:0 0 24px;font-size:24px;line-height:1.2;color:#1a1a2e;">${escapeHtml(args.eventTitle)}</h1>
        <p style="margin:0 0 4px;color:#6b6b8a;font-size:13px;">${escapeHtml(args.date)}</p>
        <p style="margin:0 0 24px;color:#6b6b8a;font-size:13px;">${escapeHtml(args.venue)}</p>
        <table style="width:100%;border-top:1px solid #e5e5ea;padding-top:16px;margin-bottom:24px;font-size:13px;">
          <tr><td style="color:#6b6b8a;padding:6px 0;">Tier</td><td style="text-align:right;color:#1a1a2e;">${escapeHtml(args.tierName)}</td></tr>
          <tr><td style="color:#6b6b8a;padding:6px 0;">Ticket holder</td><td style="text-align:right;color:#1a1a2e;">${escapeHtml(name)}</td></tr>
        </table>
        <div style="text-align:center;padding:16px;background:#f6f6f6;border-radius:8px;">
          <img src="${args.qrImageUrl}" alt="Ticket QR code" width="240" height="240" style="display:block;margin:0 auto;width:240px;height:240px;" />
          <p style="margin:12px 0 0;font-size:12px;color:#6b6b8a;">Show this at the door — one scan only.</p>
        </div>
        <p style="margin:24px 0 0;text-align:center;">
          <a href="${args.ticketUrl}" style="display:inline-block;padding:12px 24px;background:#ff5c1a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open ticket page</a>
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#6b6b8a;text-align:center;">
          Or open this link: <a href="${args.ticketUrl}" style="color:#ff5c1a;text-decoration:none;">${escapeHtml(args.ticketUrl)}</a>
        </p>
      </div>
      <p style="margin:24px 0 0;text-align:center;font-size:11px;color:#6b6b8a;">
        Powered by STAMP · stamptickets.ng
      </p>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
