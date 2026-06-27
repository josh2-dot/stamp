import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import type { WithdrawalStatus } from "@/types";

interface WithdrawalRowProps {
  amount: number;
  status: WithdrawalStatus;
  reference: string;
  requestedAt: string;
  completedAt: string | null;
  failureReason: string | null;
}

const statusTone: Record<WithdrawalStatus, "default" | "success" | "warning" | "danger" | "accent"> = {
  pending: "warning",
  otp_required: "warning",
  processing: "accent",
  success: "success",
  failed: "danger",
  reversed: "danger",
};

const statusLabel: Record<WithdrawalStatus, string> = {
  pending: "Pending",
  otp_required: "OTP required",
  processing: "Processing",
  success: "Settled",
  failed: "Failed",
  reversed: "Reversed",
};

export function WithdrawalRow({
  amount,
  status,
  reference,
  requestedAt,
  completedAt,
  failureReason,
}: WithdrawalRowProps) {
  const ts = completedAt ?? requestedAt;
  return (
    <div className="py-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="font-display text-display-xs text-stamp-white tabular-nums">
            {formatNaira(amount)}
          </p>
          <Badge tone={statusTone[status]} dot={status === "processing"}>
            {statusLabel[status]}
          </Badge>
        </div>
        <p className="text-xs text-stamp-muted-2 mt-1">
          {new Date(ts).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Africa/Lagos",
          })}
          {" · "}
          <code className="text-stamp-muted">{reference}</code>
        </p>
        {failureReason && (
          <p className="text-xs text-stamp-red mt-1">{failureReason}</p>
        )}
      </div>
    </div>
  );
}
