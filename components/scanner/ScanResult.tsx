import { cn } from "@/lib/cn";
import { StampSeal } from "@/components/ui/StampSeal";
import type { VerifyResponse } from "@/types";

interface ScanResultProps {
  result: VerifyResponse;
}

// Short codes that fit the seal's footer slot (letter-spaced, narrow band).
// Long reasons get truncated cleanly into the same visual rhythm as ADMIT.
const denyFooter: Record<string, string> = {
  already_scanned: "USED",
  invalid: "INVALID",
  wrong_event: "WRONG EVENT",
  unpaid: "UNPAID",
};

const denyReason: Record<string, string> = {
  already_scanned: "Already used",
  invalid: "Invalid ticket",
  wrong_event: "Different event",
  unpaid: "Payment pending",
};

export function ScanResult({ result }: ScanResultProps) {
  const valid = result.valid;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-6",
        valid ? "bg-stamp-green" : "bg-stamp-red",
      )}
      style={{ animation: "stamp-fade-in 0.15s ease-out" }}
    >
      {/*
        The brand mark IS the gate decision. The seal "stamps" the screen —
        carrying ADMIT or DENY as its centerText, and a short code (tier or
        reason) in the footer slot. This pays off the entire seal investment
        the audit called out: the seal at full intensity, exactly where the
        product earns it.

        currentColor on the seal SVG inherits text-stamp-black so the imprint
        reads as ink on the green/red field, not a separate color.
      */}
      <div className="text-stamp-black mb-8">
        <StampSeal
          size={260}
          tilt
          centerText={valid ? "ADMIT" : "DENY"}
          footerText={
            valid
              ? (result.ticket.tierName?.toUpperCase() ?? "TICKET")
              : (denyFooter[result.reason] ?? "REJECTED")
          }
          arcText={
            valid
              ? `ADMIT · ${result.ticket.tierName?.toUpperCase() ?? "TICKET"} · `
              : "DENY · DO NOT ADMIT · "
          }
        />
      </div>

      <div className="px-6 py-4 bg-stamp-black/10 rounded-lg text-stamp-black max-w-sm">
        {valid ? (
          <>
            <p className="font-display text-display-sm">
              {result.ticket.buyerName ?? "Anonymous"}
            </p>
            {result.ticket.tierName && (
              <p className="text-sm mt-1 opacity-80">{result.ticket.tierName}</p>
            )}
          </>
        ) : (
          <>
            <p className="font-display text-display-sm">
              {denyReason[result.reason] ?? "Rejected"}
            </p>
            {"usedAt" in result && result.usedAt && (
              <p className="text-sm mt-1 opacity-80">
                Scanned{" "}
                {new Date(result.usedAt).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </>
        )}
      </div>

      <p className="absolute bottom-10 text-stamp-black/70 text-xs tracking-[0.2em] uppercase">
        Auto-resets in 2.5s
      </p>
    </div>
  );
}
