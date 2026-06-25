import { Badge } from "@/components/ui/Badge";
import type { ScanEntry } from "@/store/useScannerStore";

interface ScanHistoryProps {
  scans: ScanEntry[];
}

export function ScanHistory({ scans }: ScanHistoryProps) {
  const checkedIn = scans.filter((s) => s.result.valid).length;
  const rejected = scans.length - checkedIn;

  return (
    <div className="bg-stamp-surface/95 backdrop-blur border-t border-stamp-border max-h-[40vh] flex flex-col">
      <div className="px-5 py-3 border-b border-stamp-border flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-stamp-muted font-medium">
          This session
        </p>
        <div className="flex items-center gap-2">
          <Badge tone="success">{checkedIn} in</Badge>
          {rejected > 0 && <Badge tone="danger">{rejected} rejected</Badge>}
        </div>
      </div>

      <ul className="overflow-y-auto flex-1 divide-y divide-stamp-border">
        {scans.length === 0 ? (
          <li className="px-5 py-6 text-center text-stamp-muted text-sm">
            Point the camera at a STAMP ticket QR.
          </li>
        ) : (
          scans.map((s) => (
            <li
              key={s.id}
              className="px-5 py-3 flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {s.result.valid ? s.result.ticket.buyerName ?? "Anonymous" : "Rejected"}
                </p>
                <p className="text-xs text-stamp-muted">
                  {s.result.valid ? s.result.ticket.tierName : reasonLabel(s.result.reason)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge tone={s.result.valid ? "success" : "danger"}>
                  {s.result.valid ? "Admit" : "Deny"}
                </Badge>
                <p className="text-xs text-stamp-muted mt-1">
                  {new Date(s.at).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function reasonLabel(reason: string): string {
  return (
    {
      already_scanned: "Already used",
      invalid: "Not a STAMP ticket",
      wrong_event: "Different event",
      unpaid: "Payment pending",
    }[reason] ?? "Rejected"
  );
}
