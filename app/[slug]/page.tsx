import { notFound } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PageShell } from "@/components/ui/PageShell";
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

  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", (event as Event).id)
    .order("sort_order", { ascending: true });

  return (
    <PageShell>
      {/* Grid was [1.4fr_1fr] — audit said the selector deserves equal weight
          since it's the primary action of the page. Equal columns let the buy
          action sit at the same visual mass as the marketing content. */}
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <EventHeader event={event as Event} />
        </div>

        {/* Decorative seal at the bottom of the sticky column removed
            (DESIGN.md ❌ wallpaper use). */}
        <div className="lg:sticky lg:top-32">
          <TicketTierSelector slug={params.slug} tiers={(tiers ?? []) as TicketTier[]} />
        </div>
      </div>
    </PageShell>
  );
}
