import Link from "next/link";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const admin = createAdminSupabase();

  const { data: events } = await admin
    .from("events")
    .select(`
      id, title, venue, event_date, slug, is_active, created_at,
      organizers!inner(id, name, email),
      ticket_tiers(sold, capacity)
    `)
    .order("event_date", { ascending: false })
    .limit(200);

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow>Events</Eyebrow>
          <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
            Everything live on STAMP.
          </h1>
        </div>
        <p className="text-stamp-muted-2 text-sm">
          {(events ?? []).length} events · sorted by event date
        </p>
      </div>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stamp-muted-2 uppercase tracking-[0.2em] border-b border-stamp-border">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Organizer</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Sold</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stamp-border">
            {(events ?? []).map((e) => {
              const organizer = Array.isArray(e.organizers)
                ? e.organizers[0]
                : e.organizers;
              const tiers = (e.ticket_tiers ?? []) as Array<{
                sold: number;
                capacity: number;
              }>;
              const sold = tiers.reduce((s, t) => s + t.sold, 0);
              const capacity = tiers.reduce((s, t) => s + t.capacity, 0);
              const isPast = new Date(e.event_date).getTime() < now;
              return (
                <tr key={e.id} className="hover:bg-stamp-surface2/50">
                  <td className="px-4 py-3 text-stamp-white max-w-xs">
                    <p className="truncate">{e.title}</p>
                    <p className="text-stamp-muted-2 text-xs">{e.venue}</p>
                  </td>
                  <td className="px-4 py-3 text-stamp-muted-2 text-xs">
                    {organizer?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-stamp-muted-2 text-xs whitespace-nowrap">
                    {new Date(e.event_date).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span className="text-stamp-white">{sold}</span>
                    <span className="text-stamp-muted-2"> / {capacity}</span>
                  </td>
                  <td className="px-4 py-3">
                    {isPast ? (
                      <Badge tone="default">Ended</Badge>
                    ) : e.is_active ? (
                      <Badge tone="default" dot>Live</Badge>
                    ) : (
                      <Badge tone="warning">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${e.slug}`}
                      target="_blank"
                      className="text-xs text-stamp-orange hover:underline"
                    >
                      /{e.slug}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(events ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-stamp-muted-2">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
