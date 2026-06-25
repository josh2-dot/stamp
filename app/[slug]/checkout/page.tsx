import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { TopNav } from "@/components/landing/TopNav";
import { CheckoutPanel } from "@/components/event/CheckoutPanel";
import type { Event, TicketTier } from "@/types";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { tier?: string };
}) {
  const tierId = searchParams.tier;
  if (!tierId) notFound();

  const supabase = createAdminSupabase();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!event) notFound();

  const { data: tier } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("id", tierId)
    .eq("event_id", (event as Event).id)
    .maybeSingle();

  if (!tier) notFound();

  return (
    <>
      <TopNav />
      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        <Link
          href={`/${params.slug}`}
          className="inline-flex items-center gap-2 text-sm text-stamp-muted hover:text-stamp-white transition-colors mb-8"
        >
          ← Back to event
        </Link>

        <CheckoutPanel event={event as Event} tier={tier as TicketTier} />
      </main>
    </>
  );
}
