import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatNaira } from "@/lib/format";
import type { DashboardSnapshot } from "@/types";

interface StatsRowProps {
  snapshot: DashboardSnapshot;
}

export function StatsRow({ snapshot }: StatsRowProps) {
  const pctFull = snapshot.totalCapacity
    ? Math.round((snapshot.totalSold / snapshot.totalCapacity) * 100)
    : 0;
  const pctCheckedIn = snapshot.totalSold
    ? Math.round((snapshot.checkedIn / snapshot.totalSold) * 100)
    : 0;

  const items = [
    {
      label: "Tickets sold",
      value: snapshot.totalSold.toLocaleString(),
      sub:
        snapshot.compCount > 0
          ? `${pctFull}% of capacity · ${snapshot.compCount} comp${snapshot.compCount === 1 ? "" : "s"}`
          : `${pctFull}% of capacity`,
      primary: true,
    },
    {
      label: "Gross revenue",
      value: formatNaira(snapshot.grossKobo),
      sub: `${formatNaira(snapshot.netToOrganizerKobo)} to you`,
    },
    {
      label: "STAMP fees",
      value: formatNaira(snapshot.feesKobo),
      sub: "Already deducted",
    },
    {
      label: "Checked in",
      value: snapshot.checkedIn.toLocaleString(),
      sub: `${pctCheckedIn}% arrived`,
    },
  ];

  return (
    // The primary KPI ("Tickets sold") spans two columns on lg+ and uses
    // display-lg, while the rest use display-sm. The audit named this:
    // identical sizing across all four cells gave the dashboard no clear
    // hero number. Now the eye lands on tickets sold first, the rest read
    // as supporting context.
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card
          key={it.label}
          accent={it.primary}
          className={it.primary ? "lg:col-span-2" : undefined}
        >
          <Eyebrow>{it.label}</Eyebrow>
          <p
            className={
              it.primary
                ? "font-display text-display-md lg:text-display-lg text-stamp-white mt-2 tabular-nums"
                : "font-display text-display-sm text-stamp-white mt-2 tabular-nums"
            }
          >
            {it.value}
          </p>
          <p className="text-stamp-muted-2 text-xs mt-1">{it.sub}</p>
        </Card>
      ))}
    </div>
  );
}
