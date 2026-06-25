import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { TopNav } from "@/components/landing/TopNav";
import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StampSeal } from "@/components/ui/StampSeal";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  // Look up the organizer record for this user via admin client (RLS would
  // require an explicit policy that lets the user read their own organizer
  // row; we have that, but admin keeps the join simpler).
  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id, name, email, phone, paystack_recipient_code")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!organizer) {
    // Shouldn't happen — callback creates the row — but degrade gracefully.
    return (
      <>
        <TopNav />
        <main className="max-w-md mx-auto px-6 pt-32 text-center">
          <h1 className="text-display text-2xl">Account setup in progress</h1>
          <p className="text-stamp-muted mt-3">Refresh in a few seconds.</p>
        </main>
      </>
    );
  }

  const { data: events } = await admin
    .from("events")
    .select(`id, title, venue, event_date, slug, is_active, ticket_tiers(sold, capacity)`)
    .eq("organizer_id", organizer.id)
    .order("event_date", { ascending: false })
    .limit(50);

  const phonePending = organizer.phone.startsWith("PENDING_");
  const payoutMissing = !organizer.paystack_recipient_code;
  const setupIncomplete = phonePending || payoutMissing;

  return (
    <>
      <TopNav />
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <CardLabel>Signed in as {organizer.email}</CardLabel>
            <h1 className="text-display text-4xl mt-2">Your events</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/payouts">
              <Button variant="ghost" size="sm">Payouts</Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="sm">Settings</Button>
            </Link>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm">Sign out</Button>
            </form>
            <Link href="/dashboard/new">
              <Button size="sm">+ New event</Button>
            </Link>
          </div>
        </div>

        {setupIncomplete && (
          <Link href="/dashboard/settings" className="block mb-6">
            <Card accent interactive className="border-stamp-orange/40">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stamp-orange font-medium">
                    Finish setup
                  </p>
                  <p className="text-display text-lg mt-1">
                    {payoutMissing
                      ? "Add bank details to receive payouts after your events."
                      : "Add your WhatsApp number so we can send you sales updates."}
                  </p>
                </div>
                <span className="text-stamp-orange text-sm">Settings →</span>
              </div>
            </Card>
          </Link>
        )}

        {!events || events.length === 0 ? (
          <Card className="text-center py-16">
            <div className="flex justify-center mb-6 opacity-30">
              <StampSeal size={140} />
            </div>
            <h2 className="text-display text-2xl">Nothing here yet</h2>
            <p className="text-stamp-muted mt-2 max-w-sm mx-auto">
              Create your first event. Set tiers. Share the link. Watch sales come in.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/new"><Button>Create your first event</Button></Link>
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e) => {
              const tiers = (e.ticket_tiers ?? []) as Array<{ sold: number; capacity: number }>;
              const sold = tiers.reduce((s, t) => s + t.sold, 0);
              const capacity = tiers.reduce((s, t) => s + t.capacity, 0);
              const date = new Date(e.event_date);
              const isPast = date.getTime() < Date.now();
              return (
                <Link key={e.id} href={`/dashboard/events/${e.id}`}>
                  <Card interactive className="h-full">
                    <div className="flex items-center justify-between mb-3">
                      <CardLabel>{date.toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</CardLabel>
                      <Badge tone={isPast ? "default" : e.is_active ? "success" : "warning"} dot={!isPast && e.is_active}>
                        {isPast ? "Ended" : e.is_active ? "Live" : "Draft"}
                      </Badge>
                    </div>
                    <h3 className="text-display text-xl text-balance">{e.title}</h3>
                    <p className="text-stamp-muted text-sm mt-1">{e.venue}</p>
                    <div className="mt-5 pt-4 border-t border-stamp-border flex items-baseline justify-between">
                      <span className="text-xs text-stamp-muted uppercase tracking-[0.2em]">Sold</span>
                      <span className="text-display text-2xl tabular-nums">
                        {sold}<span className="text-stamp-muted text-base"> / {capacity}</span>
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
