"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
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

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    setAmount(String(available / 100));
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
      <PageShell maxWidth="sm">
        <h1 className="font-display text-display-md text-stamp-white text-center">
          Couldn't load payouts
        </h1>
        <p className="text-stamp-muted-2 mt-3 text-center">{loadError}</p>
      </PageShell>
    );
  }

  if (!balance || !history || hasPayoutSetup === null) {
    return (
      <PageShell maxWidth="lg">
        <div className="animate-stamp-pulse space-y-4">
          <div className="h-8 w-48 bg-stamp-surface rounded-md" />
          <div className="h-40 bg-stamp-surface rounded-lg" />
          <div className="h-72 bg-stamp-surface rounded-lg" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="lg">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-stamp-muted-2 hover:text-stamp-white transition-colors mb-6"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-10">
        <Eyebrow>Payouts</Eyebrow>
        <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
          Your money.
        </h1>
      </div>

      {/* Balance card — the focal surface on this page */}
      <Card accent elevated className="mb-6">
        <Eyebrow>Available to withdraw</Eyebrow>
        <p className="font-display text-display-lg text-stamp-orange mt-2 tabular-nums">
          {formatNaira(balance.available)}
        </p>

        <dl className="mt-6 pt-6 border-t border-stamp-border grid grid-cols-3 gap-4 text-sm">
          <div>
            <Eyebrow as="dt">Earned</Eyebrow>
            <dd className="mt-1 tabular-nums text-stamp-white">
              {formatNaira(balance.earned)}
            </dd>
          </div>
          <div>
            <Eyebrow as="dt">In flight</Eyebrow>
            <dd className="mt-1 tabular-nums text-stamp-white">
              {formatNaira(balance.in_flight)}
            </dd>
          </div>
          <div>
            <Eyebrow as="dt">Paid out</Eyebrow>
            <dd className="mt-1 tabular-nums text-stamp-white">
              {formatNaira(balance.paid_out)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex items-center gap-3">
          {mode === "idle" && (
            // glow — the one primary action on this page
            <Button
              size="lg"
              glow
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
            <p className="text-xs text-stamp-muted-2">
              Minimum withdrawal is ₦{minNaira.toLocaleString()}.
            </p>
          )}
        </div>
      </Card>

      {/* Inline withdraw flow */}
      {mode === "form" && (
        <Card className="mb-6 space-y-4">
          <div>
            <Eyebrow>New withdrawal</Eyebrow>
            <p className="text-stamp-muted-2 text-xs mt-1">
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
        <Card className="mb-6 space-y-4" accent tone="warning">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow accent>Confirm with OTP</Eyebrow>
              <p className="text-stamp-muted-2 text-xs mt-1">
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
        // Was: className="border-stamp-green/40" — replaced with tone="success"
        <Card className="mb-6 text-center space-y-3" tone="success">
          <Badge tone="success" dot className="!inline-flex">
            Settlement initiated
          </Badge>
          <h2 className="font-display text-display-sm text-stamp-green">
            On the way to your bank.
          </h2>
          <p className="text-stamp-muted-2 text-sm">
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

      <Card>
        <div className="flex items-center justify-between mb-2">
          <Eyebrow>History</Eyebrow>
          <Badge tone="default">
            {history.length} withdrawal{history.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-stamp-muted-2">
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
    </PageShell>
  );
}
