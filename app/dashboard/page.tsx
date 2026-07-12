import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
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
          
            <a href="https://wa.me/2348068404839"
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-12 gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-stamp-border">
        <div className="min-w-0">
          {/* Sign-out is quieter — attached to the identity line as a
              text affordance, not a page-level action. */}
          <Eyebrow>
            <span className="truncate block">Signed in as {organizer.email}</span>
          </Eyebrow>
          <h1 className="font-display text-[2rem] xs:text-display-md sm:text-display-lg text-stamp-white mt-3 sm:mt-4 text-balance leading-[0.95]">
            Your events
          </h1>
          <form action="/api/auth/signout" method="post" className="inline">
            <button
              type="submit"
              className="text-xs text-stamp-muted-2 hover:text-stamp-orange transition-colors mt-3 underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
        {/* Actions row — grid on mobile so each button lands as a clean
            tap target, inline flex on ≥sm. Primary CTA spans the row on
            mobile so it doesn't get squeezed between secondaries. */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 shrink-0">
          {isAdminEmail(organizer.email) && (
            <Link href="/admin" className="w-full sm:w-auto">
              <Button variant="ghost" size="sm" fullWidth className="sm:w-auto">
                Admin
              </Button>
            </Link>
          )}
          <Link href="/dashboard/payouts" className="w-full sm:w-auto">
            <Button variant="ghost" size="sm" fullWidth className="sm:w-auto">Payouts</Button>
          </Link>
          <Link href="/dashboard/settings" className="w-full sm:w-auto">
            <Button variant="ghost" size="sm" fullWidth className="sm:w-auto">Settings</Button>
          </Link>
          {/* Primary CTA — full-width band on mobile, inline on ≥sm.
              Spans all three cols on mobile so it lands as one clean tap. */}
          <Link href="/dashboard/new" className="col-span-3 sm:col-span-1 w-full sm:w-auto">
            <Button size="sm" glow fullWidth className="sm:w-auto">+ New event</Button>
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