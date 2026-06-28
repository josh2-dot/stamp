import Link from "next/link";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const dynamic = "force-dynamic";

export default async function AdminOrganizersPage() {
  const admin = createAdminSupabase();

  const { data: organizers } = await admin
    .from("organizers")
    .select(
      "id, name, email, phone, paystack_recipient_code, created_at, custom_fee_base_kobo, custom_fee_rate_bps",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const ids = (organizers ?? []).map((o) => o.id);

  const eventCountByOrg = new Map<string, number>();
  const ticketsByOrg = new Map<string, number>();

  if (ids.length > 0) {
    const { data: events } = await admin
      .from("events")
      .select("id, organizer_id")
      .in("organizer_id", ids);

    for (const e of events ?? []) {
      eventCountByOrg.set(
        e.organizer_id,
        (eventCountByOrg.get(e.organizer_id) ?? 0) + 1,
      );
    }

    const eventIds = (events ?? []).map((e) => e.id);
    if (eventIds.length > 0) {
      const { data: tickets } = await admin
        .from("tickets")
        .select("event_id, events!inner(organizer_id)")
        .in("event_id", eventIds)
        .eq("status", "paid");

      for (const t of tickets ?? []) {
        const ev = Array.isArray(t.events) ? t.events[0] : t.events;
        const orgId = (ev as { organizer_id: string } | undefined)?.organizer_id;
        if (orgId) {
          ticketsByOrg.set(orgId, (ticketsByOrg.get(orgId) ?? 0) + 1);
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow>Organizers</Eyebrow>
          <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
            Everyone selling on STAMP.
          </h1>
        </div>
        <p className="text-stamp-muted-2 text-sm">
          {(organizers ?? []).length} total · click to view + manage
        </p>
      </div>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stamp-muted-2 uppercase tracking-[0.2em] border-b border-stamp-border">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Events</th>
              <th className="px-4 py-3 font-medium">Sold</th>
              <th className="px-4 py-3 font-medium">Fee</th>
              <th className="px-4 py-3 font-medium">Payout</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stamp-border">
            {(organizers ?? []).map((o) => {
              const phonePending = o.phone?.startsWith("PENDING_");
              const payoutReady = !!o.paystack_recipient_code;
              const hasOverride =
                o.custom_fee_base_kobo !== null &&
                o.custom_fee_rate_bps !== null;
              return (
                <tr
                  key={o.id}
                  className="hover:bg-stamp-surface2/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/organizers/${o.id}`}
                      className="text-stamp-white hover:text-stamp-orange"
                    >
                      {o.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stamp-muted-2 text-xs">
                    {o.email ?? "—"}
                    <br />
                    {phonePending ? (
                      <span className="text-stamp-gold">No phone yet</span>
                    ) : (
                      o.phone
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {(eventCountByOrg.get(o.id) ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {(ticketsByOrg.get(o.id) ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {hasOverride ? (
                      <span className="text-stamp-orange tabular-nums">
                        ₦{(Number(o.custom_fee_base_kobo) / 100).toLocaleString()}
                        {" + "}
                        {(Number(o.custom_fee_rate_bps) / 100).toLocaleString()}%
                      </span>
                    ) : (
                      <span className="text-stamp-muted-2">Default</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {payoutReady ? (
                      <Badge tone="success">Linked</Badge>
                    ) : (
                      <Badge tone="warning">Setup needed</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stamp-muted-2 text-xs whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
            {(organizers ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-stamp-muted-2">
                  No organizers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
