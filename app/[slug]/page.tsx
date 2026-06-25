import { notFound } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { TopNav } from "@/components/landing/TopNav";
import { EventHeader } from "@/components/event/EventHeader";
import { TicketTierSelector } from "@/components/event/TicketTierSelector";
import { StampSeal } from "@/components/ui/StampSeal";
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
    <>
      <TopNav />
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 items-start">
          <div>
            <EventHeader event={event as Event} />
          </div>

          <div className="lg:sticky lg:top-32">
            <TicketTierSelector slug={params.slug} tiers={(tiers ?? []) as TicketTier[]} />
            <div className="mt-8 flex items-center justify-center opacity-20">
              <StampSeal size={100} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
