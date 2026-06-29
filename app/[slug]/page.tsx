import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { EventHeader } from "@/components/event/EventHeader";
import { TicketTierSelector } from "@/components/event/TicketTierSelector";
import type { Event, TicketTier } from "@/types";

export const revalidate = 30;

export default async function EventPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminSupabase();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!event) notFound();
  const ev = event as Event & { awards_enabled?: boolean };

  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", ev.id)
    .order("sort_order", { ascending: true });

  // Awards phase scan — figure out what's live for the awards panel.
  // Three states: nominations_open (call to nominate), voting_open
  // (call to vote), revealed (results view).
  let awardsLink: { href: string; label: string; eyebrow: string } | null = null;
  if (ev.awards_enabled) {
    const { data: cats } = await supabase
      .from("award_categories")
      .select("phase")
      .eq("event_id", ev.id);
    const phases = new Set((cats ?? []).map((c) => c.phase));
    if (phases.has("nominations_open")) {
      awardsLink = {
        href: `/${params.slug}/nominate`,
        label: "Nominate someone →",
        eyebrow: "Nominations open",
      };
    } else if (phases.has("voting_open")) {
      awardsLink = {
        href: `/${params.slug}/awards`,
        label: "Vote now →",
        eyebrow: "Voting open",
      };
    } else if (phases.has("revealed") || phases.has("voting_closed")) {
      awardsLink = {
        href: `/${params.slug}/awards`,
        label: "See results →",
        eyebrow: "Awards",
      };
    }
  }

  return (
    <PageShell>
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div className="space-y-8">
          <EventHeader event={ev} />

          {/* Awards CTA — only renders when there's something for the
              visitor to do. Quiet by default, becomes prominent (accent
              border) when nominations or voting are open. */}
          {awardsLink && (
            <Card accent>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <Eyebrow>{awardsLink.eyebrow}</Eyebrow>
                  <h3 className="font-display text-display-xs text-stamp-white mt-2">
                    This event has awards.
                  </h3>
                </div>
                <Link
                  href={awardsLink.href}
                  className="text-sm text-stamp-orange hover:underline whitespace-nowrap"
                >
                  {awardsLink.label}
                </Link>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-32">
          <TicketTierSelector slug={params.slug} tiers={(tiers ?? []) as TicketTier[]} />
        </div>
      </div>
    </PageShell>
  );
}
