"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/landing/TopNav";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface SettingsData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  account_name: string | null;
  paystack_recipient_code: string | null;
}

interface Bank {
  name: string;
  code: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type ResolveState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; name: string }
  | { kind: "error"; message: string };

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSave, setProfileSave] = useState<SaveState>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  // Payout form state
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolve, setResolve] = useState<ResolveState>({ kind: "idle" });
  const [payoutSave, setPayoutSave] = useState<SaveState>("idle");
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const resolveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settingsRes, banksRes] = await Promise.all([
          fetch("/api/organizer/settings"),
          fetch("/api/banks"),
        ]);
        if (!settingsRes.ok) {
          setError("Couldn't load your settings.");
          return;
        }
        const settingsData: SettingsData = await settingsRes.json();
        const banksData: { banks: Bank[] } = await banksRes.json();
        if (cancelled) return;

        setData(settingsData);
        setBanks(banksData.banks || []);
        setName(settingsData.name);
        setPhone(settingsData.phone);
        setBankCode(settingsData.bank_code ?? "");
        setAccountNumber(settingsData.account_number ?? "");
        if (settingsData.account_name && settingsData.bank_code && settingsData.account_number) {
          setResolve({ kind: "ok", name: settingsData.account_name });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Network problem loading settings.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-resolve when bank + account number look valid
  useEffect(() => {
    if (!bankCode || accountNumber.replace(/\D/g, "").length !== 10) {
      // Reset to either previously-saved state or idle
      if (data?.account_name && data.bank_code === bankCode && data.account_number === accountNumber) {
        setResolve({ kind: "ok", name: data.account_name });
      } else {
        setResolve({ kind: "idle" });
      }
      return;
    }

    // Skip resolution if it matches what's saved
    if (
      data &&
      data.bank_code === bankCode &&
      data.account_number === accountNumber &&
      data.account_name
    ) {
      setResolve({ kind: "ok", name: data.account_name });
      return;
    }

    if (resolveDebounceRef.current) clearTimeout(resolveDebounceRef.current);

    resolveDebounceRef.current = setTimeout(async () => {
      setResolve({ kind: "loading" });
      try {
        const res = await fetch("/api/organizer/resolve-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankCode,
            accountNumber: accountNumber.replace(/\D/g, ""),
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          setResolve({ kind: "error", message: body.error || "Verification failed" });
          return;
        }
        setResolve({ kind: "ok", name: body.accountName });
      } catch (err) {
        console.error(err);
        setResolve({ kind: "error", message: "Network problem verifying account" });
      }
    }, 600);

    return () => {
      if (resolveDebounceRef.current) clearTimeout(resolveDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankCode, accountNumber]);

  const profileDirty = useMemo(() => {
    if (!data) return false;
    return name.trim() !== data.name || phone.trim() !== data.phone;
  }, [name, phone, data]);

  const payoutDirty = useMemo(() => {
    if (!data) return false;
    return (
      bankCode !== (data.bank_code ?? "") ||
      accountNumber.replace(/\D/g, "") !== (data.account_number ?? "")
    );
  }, [bankCode, accountNumber, data]);

  const saveProfile = async () => {
    setProfileError(null);
    setProfileSave("saving");
    try {
      const res = await fetch("/api/organizer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setProfileError(body.error || "Couldn't save.");
        setProfileSave("error");
        return;
      }
      setProfileSave("saved");
      setData((d) => (d ? { ...d, name: name.trim(), phone: phone.trim() } : d));
      setTimeout(() => setProfileSave("idle"), 2000);
    } catch (err) {
      console.error(err);
      setProfileError("Network problem.");
      setProfileSave("error");
    }
  };

  const savePayout = async () => {
    setPayoutError(null);
    setPayoutSave("saving");

    const selectedBank = banks.find((b) => b.code === bankCode);
    if (!selectedBank) {
      setPayoutError("Pick a bank.");
      setPayoutSave("error");
      return;
    }
    if (resolve.kind !== "ok") {
      setPayoutError("Verify the account number first.");
      setPayoutSave("error");
      return;
    }

    try {
      const res = await fetch("/api/organizer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_code: bankCode,
          bank_name: selectedBank.name,
          account_number: accountNumber.replace(/\D/g, ""),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPayoutError(body.error || "Couldn't save payout details.");
        setPayoutSave("error");
        return;
      }
      setPayoutSave("saved");
      setData((d) =>
        d
          ? {
              ...d,
              bank_code: bankCode,
              bank_name: selectedBank.name,
              account_number: accountNumber.replace(/\D/g, ""),
              account_name: resolve.kind === "ok" ? resolve.name : d.account_name,
            }
          : d,
      );
      setTimeout(() => setPayoutSave("idle"), 2000);
    } catch (err) {
      console.error(err);
      setPayoutError("Network problem.");
      setPayoutSave("error");
    }
  };

  if (error) {
    return (
      <>
        <TopNav />
        <main className="max-w-md mx-auto px-6 pt-40 text-center">
          <h1 className="text-display text-2xl">Couldn't load settings</h1>
          <p className="text-stamp-muted mt-3">{error}</p>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <TopNav />
        <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
          <div className="animate-stamp-pulse space-y-4">
            <div className="h-8 w-64 bg-stamp-surface rounded-md" />
            <div className="h-48 bg-stamp-surface rounded-lg" />
            <div className="h-48 bg-stamp-surface rounded-lg" />
          </div>
        </main>
      </>
    );
  }

  const payoutComplete = !!data.account_name && !!data.bank_code && !!data.paystack_recipient_code;

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
          <CardLabel>Settings</CardLabel>
          <h1 className="text-display text-4xl mt-2">Account.</h1>
          <p className="text-stamp-muted text-sm mt-2">
            Signed in as <span className="text-stamp-white">{data.email}</span>
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <Card className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <CardLabel>Profile</CardLabel>
                <p className="text-stamp-muted text-xs mt-1">
                  This is what buyers see and where we send organizer notifications.
                </p>
              </div>
              {profileSave === "saved" && <Badge tone="success">Saved</Badge>}
            </div>

            <Input
              label="Organization name"
              placeholder="e.g. RSU Computer Science Society"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="WhatsApp number"
              placeholder="0801 234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              prefix="+234"
              hint="We send live sales notifications here while events are running."
            />

            {profileError && (
              <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
                {profileError}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={saveProfile}
                loading={profileSave === "saving"}
                disabled={!profileDirty}
                variant={profileDirty ? "primary" : "secondary"}
              >
                Save profile
              </Button>
            </div>
          </Card>

          {/* Payouts */}
          <Card className="space-y-5" accent={!payoutComplete}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardLabel>Payouts</CardLabel>
                <p className="text-stamp-muted text-xs mt-1">
                  Where we settle your money after each event.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {payoutComplete ? (
                  <Badge tone="success" dot>
                    Verified
                  </Badge>
                ) : (
                  <Badge tone="warning">Setup needed</Badge>
                )}
                {payoutSave === "saved" && <Badge tone="success">Saved</Badge>}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.18em] text-stamp-muted font-medium mb-2">
                Bank
              </label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full bg-stamp-surface2 border border-stamp-border rounded-md px-3.5 py-2.5 text-sm text-stamp-white outline-none focus:border-stamp-orange/60 transition-colors"
              >
                <option value="">Pick a bank</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Account number"
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              hint="10-digit NUBAN. We verify the account holder name with your bank."
            />

            {/* Resolution feedback */}
            <ResolveFeedback state={resolve} />

            {payoutError && (
              <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
                {payoutError}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={savePayout}
                loading={payoutSave === "saving"}
                disabled={!payoutDirty || resolve.kind !== "ok"}
                variant={payoutDirty ? "primary" : "secondary"}
              >
                Save payout details
              </Button>
            </div>
          </Card>

          {/* Currently linked account, read-only summary */}
          {payoutComplete && !payoutDirty && (
            <Card elevated>
              <CardLabel>Linked payout account</CardLabel>
              <div className="mt-3 flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-display text-xl">{data.account_name}</p>
                  <p className="text-stamp-muted text-sm mt-1">
                    {data.bank_name} · {maskAccount(data.account_number ?? "")}
                  </p>
                </div>
                <Badge tone="success" dot>
                  Ready for payouts
                </Badge>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}

function ResolveFeedback({ state }: { state: ResolveState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-3 text-sm text-stamp-muted p-3 rounded-md bg-stamp-surface2 border border-stamp-border">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-stamp-muted border-t-transparent animate-spin" />
        Verifying with your bank…
      </div>
    );
  }
  if (state.kind === "ok") {
    return (
      <div className="p-4 rounded-md bg-stamp-green/10 border border-stamp-green/30">
        <p className="text-xs uppercase tracking-[0.2em] text-stamp-green font-medium">
          Account verified
        </p>
        <p className="text-display text-xl mt-1">{state.name}</p>
      </div>
    );
  }
  return (
    <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
      {state.message}
    </div>
  );
}

function maskAccount(acct: string): string {
  if (acct.length < 4) return acct;
  return `••• •••• ${acct.slice(-4)}`;
}
