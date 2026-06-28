import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getPlatformFees } from "@/lib/fee-rules";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatNaira } from "@/lib/format";
import { FeeOverrideEditor } from "./FeeOverrideEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function AdminOrganizerDetailPage({ params }: PageProps) {
  const admin = createAdminSupabase();

  const { data: organizer } = await admin
    .from("organizers")
    .select(
      "id, name, email, phone, bank_name, account_number, account_name, paystack_recipient_code, created_at, custom_fee_base_kobo, custom_fee_rate_bps",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!organizer) notFound();

  // Events + ticket counts for the stats cards
  const { data: events } = await admin
    .from("events")
    .select(
      "id, title, slug, event_date, is_active, ticket_tiers(price, service_fee, sold)",
    )
    .eq("organizer_id", organizer.id)
    .order("event_date", { ascending: false });

  const allTiers = (events ?? []).flatMap(
    (e) =>
      (e.ticket_tiers ?? []) as Array<{
        price: number;
        service_fee: number;
        sold: number;
      }>,
  );
  const ticketsSold = allTiers.reduce((s, t) => s + t.sold, 0);
  const gmv = allTiers.reduce(
    (s, t) => s + (t.price + t.service_fee) * t.sold,
    0,
  );
  const earnings = allTiers.reduce((s, t) => s + t.price * t.sold, 0);

  const defaults = await getPlatformFees();
  const phonePending = organizer.phone?.startsWith("PENDING_");
  const payoutReady = !!organizer.paystack_recipient_code;
  const hasOverride =
    organizer.custom_fee_base_kobo !== null &&
    organizer.custom_fee_rate_bps !== null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/organizers"
          className="text-xs text-stamp-muted-2 hover:text-stamp-white"
        >
          ← All organizers
        </Link>
        <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2 text-balance">
          {organizer.name}
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-1">{organizer.email}</p>
      </div>

      {/* Lifetime stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <Eyebrow>Lifetime GMV</Eyebrow>
          <p className="font-display text-display-sm text-stamp-white mt-2 tabular-nums">
            {formatNaira(gmv)}
          </p>
          <p className="text-stamp-muted-2 text-xs mt-1">
            Buyers' gross spend
          </p>
        </Card>
        <Card>
          <Eyebrow>Earned (org)</Eyebrow>
          <p className="font-display text-display-sm text-stamp-white mt-2 tabular-nums">
            {formatNaira(earnings)}
          </p>
          <p className="text-stamp-muted-2 text-xs mt-1">Net of STAMP fees</p>
        </Card>
        <Card>
          <Eyebrow>Tickets sold</Eyebrow>
          <p className="font-display text-display-sm text-stamp-white mt-2 tabular-nums">
            {ticketsSold.toLocaleString()}
          </p>
          <p className="text-stamp-muted-2 text-xs mt-1">
            Across {(events ?? []).length} events
          </p>
        </Card>
      </div>

      {/* Fee override editor — the main reason this page exists */}
      <FeeOverrideEditor
        organizerId={organizer.id}
        organizerName={organizer.name}
        initialBaseKobo={organizer.custom_fee_base_kobo}
        initialRateBps={organizer.custom_fee_rate_bps}
        defaultBaseKobo={defaults.base}
        defaultRateBps={defaults.rate}
      />

      {/* Profile + payout */}
      <Card className="space-y-4">
        <Eyebrow>Profile</Eyebrow>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-stamp-muted-2 text-xs">Email</dt>
            <dd className="text-stamp-white mt-1">{organizer.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-stamp-muted-2 text-xs">WhatsApp</dt>
            <dd className="text-stamp-white mt-1">
              {phonePending ? (
                <span className="text-stamp-gold">Not set yet</span>
              ) : (
                organizer.phone
              )}
            </dd>
          </div>
          <div>
            <dt className="text-stamp-muted-2 text-xs">Joined</dt>
            <dd className="text-stamp-white mt-1">
              {new Date(organizer.created_at).toLocaleDateString("en-NG", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-stamp-muted-2 text-xs">Payout</dt>
            <dd className="mt-1">
              {payoutReady ? (
                <Badge tone="success" dot>
                  {organizer.bank_name} ·{" "}
                  {organizer.account_number?.slice(-4)
                    ? `••••${organizer.account_number.slice(-4)}`
                    : ""}
                </Badge>
              ) : (
                <Badge tone="warning">Not linked</Badge>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Recent events */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-stamp-border">
          <Eyebrow>Events</Eyebrow>
        </div>
        {(events ?? []).length === 0 ? (
          <p className="text-center py-12 text-stamp-muted-2 text-sm">
            No events yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-stamp-border">
              {(events ?? []).map((e) => {
                const tiers = (e.ticket_tiers ?? []) as Array<{
                  price: number;
                  service_fee: number;
                  sold: number;
                }>;
                const sold = tiers.reduce((s, t) => s + t.sold, 0);
                const past = new Date(e.event_date).getTime() < Date.now();
                return (
                  <tr key={e.id} className="hover:bg-stamp-surface2/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${e.slug}`}
                        target="_blank"
                        className="text-stamp-white hover:text-stamp-orange"
                      >
                        {e.title}
                      </Link>
                      <p className="text-stamp-muted-2 text-xs">
                        {new Date(e.event_date).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {sold} sold
                    </td>
                    <td className="px-4 py-3 text-right">
                      {past ? (
                        <Badge tone="default">Ended</Badge>
                      ) : e.is_active ? (
                        <Badge tone="default" dot>
                          Live
                        </Badge>
                      ) : (
                        <Badge tone="warning">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-xs text-stamp-muted-2 text-center pb-4">
        Override changes only affect new tier saves — existing tickets keep
        the fee they were created with.
      </p>
    </div>
  );
}
