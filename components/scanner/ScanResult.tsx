import { cn } from "@/lib/cn";
import type { VerifyResponse } from "@/types";

interface ScanResultProps {
  result: VerifyResponse;
}

const reasonText: Record<string, string> = {
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
      {/* Big check or X */}
      <div className="mb-6">
        {valid ? (
          <svg
            viewBox="0 0 100 100"
            width={140}
            height={140}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="#0A0A14" strokeWidth="3" />
            <path
              d="M30 52 L45 67 L72 38"
              fill="none"
              stroke="#0A0A14"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 100 100"
            width={140}
            height={140}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="#0A0A14" strokeWidth="3" />
            <path
              d="M32 32 L68 68 M68 32 L32 68"
              stroke="#0A0A14"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <h2 className="text-display text-5xl text-stamp-black">
        {valid ? "ADMIT" : "DENY"}
      </h2>

      <div className="mt-6 px-6 py-3 bg-stamp-black/10 rounded-lg text-stamp-black">
        {valid ? (
          <>
            <p className="font-semibold">{result.ticket.buyerName ?? "Anonymous"}</p>
            <p className="text-sm mt-1">{result.ticket.tierName}</p>
          </>
        ) : (
          <>
            <p className="font-semibold">{reasonText[result.reason] ?? "Rejected"}</p>
            {"usedAt" in result && result.usedAt && (
              <p className="text-sm mt-1">
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

      <p className="absolute bottom-10 text-stamp-black/70 text-xs tracking-[0.3em] uppercase">
        Auto-resets in 2.5s
      </p>
    </div>
  );
}
