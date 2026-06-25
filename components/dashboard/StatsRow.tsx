import { Card, CardLabel } from "@/components/ui/Card";
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
      sub: `${pctFull}% of capacity`,
      accent: true,
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label} accent={it.accent}>
          <CardLabel>{it.label}</CardLabel>
          <p className="text-display text-3xl lg:text-4xl mt-2">{it.value}</p>
          <p className="text-stamp-muted text-xs mt-1">{it.sub}</p>
        </Card>
      ))}
    </div>
  );
}
