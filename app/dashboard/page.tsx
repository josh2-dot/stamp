import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const admin = createAdminSupabase();
  const { data: organizer } = await admin
    .from("organizers")
    .select("id, name, email, phone, paystack_recipient_code")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!organizer) {
    return (
      <PageShell maxWidth="sm">
        <h1 className="font-display text-display-md text-stamp-white text-center">
          Account not found
        </h1>
        <p className="text-stamp-muted-2 mt-3 text-center">
          Your sign-in worked, but we don't have an organizer record for you.
          That's a setup bug on our side — message us on WhatsApp and we'll fix it.
        </p>
        <div className="text-center mt-6">
          <a
            href="https://wa.me/2348012345678"
            className="text-stamp-orange hover:underline"
          >
            Message support →
          </a>
        </div>
      </PageShell>
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
    <PageShell>
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          {/* Sign out moved off the primary action row. It now lives as a
              quiet text affordance attached to the account context — peers
              with the email, not with the page actions. */}
          <Eyebrow>
            Signed in as {organizer.email}
            {" · "}
            <form action="/api/auth/signout" method="post" className="inline">
              <button
                type="submit"
                className="text-stamp-muted hover:text-stamp-orange transition-colors underline-offset-2 hover:underline"
              >
                Sign out
              </button>
            </form>
          </Eyebrow>
          <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
            Your events
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/payouts">
            <Button variant="ghost" size="sm">Payouts</Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm">Settings</Button>
          </Link>
          {/* glow — the one headline action on the dashboard */}
          <Link href="/dashboard/new">
            <Button size="sm" glow>+ New event</Button>
          </Link>
        </div>
      </div>

      {setupIncomplete && (
        <Link href="/dashboard/settings" className="block mb-6">
          {/* Was: <Card accent interactive className="border-stamp-orange/40">
              The border was a one-off style escape. tone="warning" + accent
              now expresses "needs attention + the page's one focal surface"
              through the proper component variants. */}
          <Card accent interactive tone="warning">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Eyebrow accent>Finish setup</Eyebrow>
                <p className="font-display text-display-xs text-stamp-white mt-1">
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
          {/* Empty-state seal removed per DESIGN.md (❌ wallpaper use).
              Type does the wayfinding here. */}
          <Eyebrow align="center">No events yet</Eyebrow>
          <h2 className="font-display text-display-md text-stamp-white mt-3">
            Nothing here yet
          </h2>
          <p className="text-stamp-muted-2 mt-3 max-w-sm mx-auto">
            Create your first event. Set tiers. Share the link. Watch sales come in.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/new">
              <Button glow>Create your first event</Button>
            </Link>
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
            // "Live" here means active sales — not gate verification, so use
            // default tone + pulsing dot per DESIGN.md.
            const badgeTone = isPast ? "default" : e.is_active ? "default" : "warning";
            const badgeLabel = isPast ? "Ended" : e.is_active ? "Live" : "Draft";
            return (
              <Link key={e.id} href={`/dashboard/events/${e.id}`}>
                <Card interactive className="h-full">
                  <div className="flex items-center justify-between mb-3">
                    <Eyebrow>
                      {date.toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                    </Eyebrow>
                    <Badge tone={badgeTone} dot={!isPast && e.is_active}>
                      {badgeLabel}
                    </Badge>
                  </div>
                  <h3 className="font-display text-display-xs text-stamp-white text-balance">
                    {e.title}
                  </h3>
                  <p className="text-stamp-muted-2 text-sm mt-1">{e.venue}</p>
                  <div className="mt-5 pt-4 border-t border-stamp-border flex items-baseline justify-between">
                    <Eyebrow>Sold</Eyebrow>
                    <span className="font-display text-display-sm text-stamp-white tabular-nums">
                      {sold}
                      <span className="text-stamp-muted text-base">
                        {" "}/ {capacity}
                      </span>
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
