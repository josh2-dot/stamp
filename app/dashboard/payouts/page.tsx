"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/landing/TopNav";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { WithdrawalRow } from "@/components/dashboard/WithdrawalRow";
import { formatNaira } from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { MIN_WITHDRAWAL_KOBO } from "@/lib/withdrawal-rules";
import type {
  BalanceSummary,
  CreateWithdrawalResponse,
  Withdrawal,
} from "@/types";

type Mode = "idle" | "form" | "otp" | "success";

export default function PayoutsPage() {
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [history, setHistory] = useState<Withdrawal[] | null>(null);
  const [hasPayoutSetup, setHasPayoutSetup] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Withdraw flow state
  const [mode, setMode] = useState<Mode>("idle");
  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [b, h, s] = await Promise.all([
        fetch("/api/organizer/balance"),
        fetch("/api/withdrawals/list"),
        fetch("/api/organizer/settings"),
      ]);
      if (!b.ok || !h.ok || !s.ok) {
        setLoadError("Couldn't load payouts.");
        return;
      }
      const balanceData: BalanceSummary = await b.json();
      const historyData: { withdrawals: Withdrawal[] } = await h.json();
      const settingsData: { paystack_recipient_code: string | null } = await s.json();
      setBalance(balanceData);
      setHistory(historyData.withdrawals);
      setHasPayoutSetup(!!settingsData.paystack_recipient_code);
    } catch (err) {
      console.error(err);
      setLoadError("Network problem.");
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime — react to webhook updates on withdrawals
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel("withdrawals:org")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const minNaira = MIN_WITHDRAWAL_KOBO / 100;
  const available = balance?.available ?? 0;
  const canWithdraw = !!hasPayoutSetup && available >= MIN_WITHDRAWAL_KOBO;

  const startWithdraw = () => {
    setMode("form");
    setAmount(String(available / 100)); // pre-fill with full balance in naira
    setFormError(null);
  };

  const cancelFlow = () => {
    setMode("idle");
    setAmount("");
    setOtp("");
    setPendingId(null);
    setFormError(null);
  };

  const submitWithdraw = async () => {
    setFormError(null);
    const naira = parseFloat(amount);
    if (!Number.isFinite(naira) || naira < minNaira) {
      setFormError(`Minimum withdrawal is ₦${minNaira.toLocaleString()}.`);
      return;
    }
    if (naira > available / 100) {
      setFormError("Amount exceeds available balance.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(naira * 100) }),
      });
      const data = (await res.json()) as CreateWithdrawalResponse | { error: string };

      if (!res.ok || "error" in data) {
        setFormError(("error" in data && data.error) || "Couldn't initiate withdrawal.");
        setSubmitting(false);
        return;
      }

      if (data.status === "otp_required") {
        setPendingId(data.withdrawalId);
        setMode("otp");
      } else {
        setMode("success");
      }
      await refresh();
    } catch (err) {
      console.error(err);
      setFormError("Network problem.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async () => {
    if (!pendingId) return;
    setFormError(null);
    if (!otp.trim()) {
      setFormError("Enter the OTP from your registered email/phone.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/withdrawals/${pendingId}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "OTP rejected. Try again.");
        setSubmitting(false);
        return;
      }
      setMode("success");
      await refresh();
    } catch (err) {
      console.error(err);
      setFormError("Network problem.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <>
        <TopNav />
        <main className="max-w-md mx-auto px-6 pt-40 text-center">
          <h1 className="text-display text-2xl">Couldn't load payouts</h1>
          <p className="text-stamp-muted mt-3">{loadError}</p>
        </main>
      </>
    );
  }

  if (!balance || !history || hasPayoutSetup === null) {
    return (
      <>
        <TopNav />
        <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
          <div className="animate-stamp-pulse space-y-4">
            <div className="h-8 w-48 bg-stamp-surface rounded-md" />
            <div className="h-40 bg-stamp-surface rounded-lg" />
            <div className="h-72 bg-stamp-surface rounded-lg" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-stamp-muted hover:text-stamp-white transition-colors mb-6"
        >
          ← Back to dashboard
        </Link>

        <div className="mb-10">
          <CardLabel>Payouts</CardLabel>
          <h1 className="text-display text-4xl mt-2">Your money.</h1>
        </div>

        {/* Balance card */}
        <Card accent elevated className="mb-6">
          <CardLabel>Available to withdraw</CardLabel>
          <p className="text-display text-5xl text-stamp-orange mt-2 tabular-nums">
            {formatNaira(balance.available)}
          </p>

          <dl className="mt-6 pt-6 border-t border-stamp-border grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
                Earned
              </dt>
              <dd className="mt-1 tabular-nums">{formatNaira(balance.earned)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
                In flight
              </dt>
              <dd className="mt-1 tabular-nums">{formatNaira(balance.in_flight)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
                Paid out
              </dt>
              <dd className="mt-1 tabular-nums">{formatNaira(balance.paid_out)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center gap-3">
            {mode === "idle" && (
              <Button
                size="lg"
                onClick={startWithdraw}
                disabled={!canWithdraw}
              >
                Withdraw
              </Button>
            )}
            {!hasPayoutSetup && (
              <Link href="/dashboard/settings" className="text-sm text-stamp-orange hover:underline">
                Add bank details first →
              </Link>
            )}
            {hasPayoutSetup && available < MIN_WITHDRAWAL_KOBO && (
              <p className="text-xs text-stamp-muted">
                Minimum withdrawal is ₦{minNaira.toLocaleString()}.
              </p>
            )}
          </div>
        </Card>

        {/* Inline withdraw flow */}
        {mode === "form" && (
          <Card className="mb-6 space-y-4">
            <div>
              <CardLabel>New withdrawal</CardLabel>
              <p className="text-stamp-muted text-xs mt-1">
                Settles to your verified bank account.
              </p>
            </div>

            <Input
              label="Amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              prefix="₦"
              hint={`Available: ${formatNaira(available)}`}
            />

            {formError && (
              <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={cancelFlow} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitWithdraw} loading={submitting}>
                Initiate withdrawal
              </Button>
            </div>
          </Card>
        )}

        {mode === "otp" && (
          <Card className="mb-6 space-y-4" accent>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardLabel>Confirm with OTP</CardLabel>
                <p className="text-stamp-muted text-xs mt-1">
                  Paystack sent a code to STAMP's registered phone/email.
                  Ask Joshua or check the team line.
                </p>
              </div>
              <Badge tone="warning" dot>Awaiting OTP</Badge>
            </div>

            <Input
              label="OTP code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\s+/g, ""))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
            />

            {formError && (
              <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={cancelFlow} disabled={submitting}>
                Leave for now
              </Button>
              <Button onClick={submitOtp} loading={submitting}>
                Finalize transfer
              </Button>
            </div>
          </Card>
        )}

        {mode === "success" && (
          <Card className="mb-6 text-center space-y-3 border-stamp-green/40">
            <Badge tone="success" dot className="!inline-flex">
              Settlement initiated
            </Badge>
            <h2 className="text-display text-2xl text-stamp-green">
              On the way to your bank.
            </h2>
            <p className="text-stamp-muted text-sm">
              We'll WhatsApp you the moment Paystack confirms the transfer.
              Most settle within minutes.
            </p>
            <div>
              <Button variant="secondary" onClick={cancelFlow}>
                Done
              </Button>
            </div>
          </Card>
        )}

        {/* History */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <CardLabel>History</CardLabel>
            <Badge tone="default">{history.length} withdrawal{history.length === 1 ? "" : "s"}</Badge>
          </div>

          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-stamp-muted">
              No withdrawals yet. Your money is waiting.
            </p>
          ) : (
            <div className="divide-y divide-stamp-border">
              {history.map((w) => (
                <WithdrawalRow
                  key={w.id}
                  amount={w.amount}
                  status={w.status}
                  reference={w.paystack_reference}
                  requestedAt={w.requested_at}
                  completedAt={w.completed_at}
                  failureReason={w.failure_reason}
                />
              ))}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
