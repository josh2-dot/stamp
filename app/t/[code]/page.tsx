import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StampSeal } from "@/components/ui/StampSeal";

export const dynamic = "force-dynamic";

interface Props {
  params: { code: string };
}

interface TicketRow {
  id: string;
  status: string;
  buyer_name: string | null;
  qr_code: string;
  qr_image_url: string | null;
  used: boolean;
  used_at: string | null;
  created_at: string;
  ticket_tiers: { name: string } | Array<{ name: string }>;
  events:
    | { title: string; venue: string; event_date: string }
    | Array<{ title: string; venue: string; event_date: string }>;
}

/**
 * Canonical public ticket page. The qr_code UUID is the URL — anyone with
 * the link can view (the secret IS the URL), but only the door scanner
 * with the event's scanner_secret can mark it used.
 *
 * This is the source of truth for every delivery channel:
 *  - SMS body links here
 *  - Email "Open ticket page" button links here
 *  - WhatsApp message (when enabled) includes this URL
 *  - Success page shows it prominently as a bookmarkable URL
 *
 * Buyers can bookmark this page, share it with a friend who's on the gate,
 * pull it up offline (browsers cache it), and refer to it weeks later.
 */
export default async function TicketPage({ params }: Props) {
  const admin = createAdminSupabase();

  const { data: ticket } = await admin
    .from("tickets")
    .select(`
      id, status, buyer_name, qr_code, qr_image_url, used, used_at, created_at,
      ticket_tiers!inner(name),
      events!inner(title, venue, event_date)
    `)
    .eq("qr_code", params.code)
    .maybeSingle<TicketRow>();

  if (!ticket) notFound();

  // Normalize Supabase's "may be array, may be object" join shape
  const tier = Array.isArray(ticket.ticket_tiers)
    ? ticket.ticket_tiers[0]
    : ticket.ticket_tiers;
  const ev = Array.isArray(ticket.events)
    ? ticket.events[0]
    : ticket.events;

  // Defensive: schema-level FKs should make these impossible to lose,
  // but the join shape leaves them typed as possibly undefined.
  if (!ev || !tier) notFound();

  const date = new Date(ev.event_date);
  const past = date.getTime() < Date.now();

  // Tickets pending payment shouldn't show a QR — buyer hasn't paid yet.
  if (ticket.status !== "paid") {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center space-y-4">
          <Eyebrow align="center">Ticket pending</Eyebrow>
          <h1 className="font-display text-display-md text-stamp-white">
            Payment not confirmed yet
          </h1>
          <p className="text-stamp-muted-2 text-sm">
            We're still waiting on payment confirmation from Paystack. If you
            just paid, refresh this page in a few seconds.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="sm">
      <div className="text-center mb-6">
        <Eyebrow align="center">Your ticket</Eyebrow>
        <h1 className="font-display text-display-md text-stamp-white mt-2 text-balance">
          {ev.title}
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-2">
          {date.toLocaleDateString("en-NG", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "Africa/Lagos",
          })}
          {" · "}
          {date.toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Africa/Lagos",
          })}
        </p>
        <p className="text-stamp-muted-2 text-sm">{ev.venue}</p>
      </div>

      {/* Status banner — varies by used vs unused vs past */}
      {ticket.used ? (
        <div className="mb-4 text-center">
          <Badge tone="default">
            Already scanned at{" "}
            {ticket.used_at
              ? new Date(ticket.used_at).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "the door"}
          </Badge>
        </div>
      ) : past ? (
        <div className="mb-4 text-center">
          <Badge tone="warning">Event ended</Badge>
        </div>
      ) : null}

      {/* The QR — the whole point of this page */}
      <Card accent elevated className="text-center space-y-4">
        {ticket.qr_image_url ? (
          <img
            src={ticket.qr_image_url}
            alt="Ticket QR code"
            className="mx-auto w-64 h-64 rounded-md bg-white p-2"
            // Browsers cache this aggressively because the URL is content-addressed.
          />
        ) : (
          <div className="w-64 h-64 mx-auto bg-stamp-surface2 rounded-md flex items-center justify-center">
            <StampSeal size={120} className="opacity-40" />
          </div>
        )}

        <div className="pt-2">
          <Eyebrow align="center">{tier?.name ?? "Ticket"}</Eyebrow>
          {ticket.buyer_name && (
            <p className="text-stamp-white mt-1">{ticket.buyer_name}</p>
          )}
        </div>

        <p className="text-xs text-stamp-muted-2 pt-3 border-t border-stamp-border">
          Show this at the door · One scan only
        </p>
      </Card>

      {/* Save-link hint — the page can be lost; the URL can't if bookmarked. */}
      <div className="mt-6 p-4 rounded-md bg-stamp-surface2 border border-stamp-border text-center">
        <p className="text-xs text-stamp-muted-2 mb-1">
          Bookmark this page or save the link
        </p>
        <code className="text-xs text-stamp-orange break-all">
          {process.env.NEXT_PUBLIC_APP_URL}/t/{ticket.qr_code}
        </code>
      </div>

      <p className="text-center text-xs text-stamp-muted-2 mt-8">
        <Link href="/" className="hover:text-stamp-white">
          ← stamptickets.ng
        </Link>
      </p>
    </PageShell>
  );
}
