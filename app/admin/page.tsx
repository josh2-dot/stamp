import { createAdminSupabase } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatNaira } from "@/lib/format";
import { getPlatformFees } from "@/lib/fee-rules";

export const dynamic = "force-dynamic";

interface PlatformStats {
  organizers_count: number;
  events_count: number;
  events_active_count: number;
  tickets_paid_count: number;
  gmv_kobo: number;
  stamp_revenue_kobo: number;
  organizer_earnings_kobo: number;
}

export default async function AdminOverviewPage() {
  const admin = createAdminSupabase();

  const [{ data: statsRaw }, fees] = await Promise.all([
    admin.rpc("platform_stats"),
    getPlatformFees(),
  ]);

  const stats: PlatformStats = (Array.isArray(statsRaw) ? statsRaw[0] : statsRaw) ?? {
    organizers_count: 0,
    events_count: 0,
    events_active_count: 0,
    tickets_paid_count: 0,
    gmv_kobo: 0,
    stamp_revenue_kobo: 0,
    organizer_earnings_kobo: 0,
  };

  const stampSharePct =
    stats.gmv_kobo > 0
      ? ((stats.stamp_revenue_kobo / stats.gmv_kobo) * 100).toFixed(1)
      : "—";

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Platform overview</Eyebrow>
        <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
          STAMP, end-to-end.
        </h1>
      </div>

      {/* Primary financial KPI — STAMP revenue spans two cols, others trail */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card accent className="lg:col-span-2">
          <Eyebrow>STAMP revenue</Eyebrow>
          <p className="font-display text-display-md lg:text-display-lg text-stamp-orange mt-2 tabular-nums">
            {formatNaira(stats.stamp_revenue_kobo)}
          </p>
          <p className="text-stamp-muted-2 text-xs mt-1">
            {stampSharePct}% of GMV · across {stats.tickets_paid_count.toLocaleString()} tickets
          </p>
        </Card>

        <Card>
          <Eyebrow>GMV (gross)</Eyebrow>
          <p className="font-display text-display-sm text-stamp-white mt-2 tabular-nums">
            {formatNaira(stats.gmv_kobo)}
          </p>
          <p className="text-stamp-muted-2 text-xs mt-1">What buyers paid in total</p>
        </Card>

        <Card>
          <Eyebrow>Organizer earnings</Eyebrow>
          <p className="font-display text-display-sm text-stamp-white mt-2 tabular-nums">
            {formatNaira(stats.organizer_earnings_kobo)}
          </p>
          <p className="text-stamp-muted-2 text-xs mt-1">Owed to or already settled</p>
        </Card>
      </div>

      {/* Operational counts */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <Eyebrow>Organizers</Eyebrow>
          <p className="font-display text-display-sm text-stamp-white mt-2 tabular-nums">
            {stats.organizers_count.toLocaleString()}
          </p>
        </Card>
        <Card>
          <Eyebrow>Events</Eyebrow>
          <p className="font-display text-display-sm text-stamp-white mt-2 tabular-nums">
            {stats.events_count.toLocaleString()}
          </p>
          <p className="text-stamp-muted-2 text-xs mt-1">
            {stats.events_active_count.toLocaleString()} live
          </p>
        </Card>
        <Card>
          <Eyebrow>Tickets sold</Eyebrow>
          <p className="font-display text-display-sm text-stamp-white mt-2 tabular-nums">
            {stats.tickets_paid_count.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Current fee config — quick reference, full editor at /admin/fees */}
      <Card className="space-y-3">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Current fee model</Eyebrow>
          <a href="/admin/fees" className="text-xs text-stamp-orange hover:underline">
            Edit →
          </a>
        </div>
        <div className="flex items-baseline gap-4">
          <p className="font-display text-display-sm text-stamp-white tabular-nums">
            ₦{(fees.base / 100).toLocaleString()} + {(fees.rate / 100).toLocaleString()}%
          </p>
          <p className="text-xs text-stamp-muted-2">
            Added silently to each ticket. Organizers keep the bare price.
          </p>
        </div>
      </Card>
    </div>
  );
}
