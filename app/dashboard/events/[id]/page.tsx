"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/landing/TopNav";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { TierBreakdown } from "@/components/dashboard/TierBreakdown";
import { HourlyChart } from "@/components/dashboard/HourlyChart";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { Badge } from "@/components/ui/Badge";
import { Card, CardLabel } from "@/components/ui/Card";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { DashboardSnapshot } from "@/types";

export default function EventDashboardPage() {
  const params = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);

  const fetchSnapshot = async () => {
    const res = await fetch(`/api/events/${params.id}/dashboard`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't load dashboard.");
      return;
    }
    const data: DashboardSnapshot = await res.json();
    setSnapshot(data);
  };

  useEffect(() => {
    fetchSnapshot();

    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`tickets:event_${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `event_id=eq.${params.id}`,
        },
        () => {
          // On any change, re-fetch the snapshot. Cheap, simple, correct.
          fetchSnapshot();
          setPulse((p) => p + 1);
        },
      )
      .subscribe();

    // Refresh every 30s as belt-and-suspenders for realtime hiccups
    const interval = setInterval(fetchSnapshot, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (error) {
    return (
      <>
        <TopNav />
        <main className="max-w-2xl mx-auto px-6 pt-40 text-center">
          <h1 className="text-display text-3xl">Couldn't load dashboard</h1>
          <p className="text-stamp-muted mt-3">{error}</p>
          <Link href="/dashboard" className="text-stamp-orange mt-6 inline-block hover:underline">
            ← Back to events
          </Link>
        </main>
      </>
    );
  }

  if (!snapshot) {
    return (
      <>
        <TopNav />
        <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
          <div className="space-y-4 animate-stamp-pulse">
            <div className="h-8 w-64 bg-stamp-surface rounded-md" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-stamp-surface rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  const ev = snapshot.event;

  return (
    <>
      <TopNav />
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Link href="/dashboard" className="text-xs text-stamp-muted hover:text-stamp-white transition-colors">
              ← All events
            </Link>
            <h1 className="text-display text-3xl sm:text-4xl mt-2 text-balance">{ev.title}</h1>
            <p className="text-stamp-muted text-sm mt-1">
              {new Date(ev.event_date).toLocaleDateString("en-NG", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {ev.venue}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge tone={ev.is_active ? "success" : "warning"} dot={ev.is_active} key={pulse}>
              {ev.is_active ? "Live" : "Deactivated"}
            </Badge>
            <Link href={`/dashboard/events/${ev.id}/edit`} className="text-sm text-stamp-muted hover:text-stamp-white transition-colors">
              Edit
            </Link>
            <Link
              href={`/scan/${ev.id}?token=${encodeURIComponent(ev.scanner_secret)}`}
              className="text-sm text-stamp-orange hover:underline"
            >
              Open scanner →
            </Link>
          </div>
        </div>

        {!ev.is_active && (
          <Card className="border-stamp-gold/40 bg-stamp-gold/5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stamp-gold font-medium">
                  Event deactivated
                </p>
                <p className="text-sm mt-1 text-stamp-white/90">
                  New ticket sales are paused. Existing tickets still scan at the door.
                </p>
              </div>
              <Link href={`/dashboard/events/${ev.id}/edit`} className="text-sm text-stamp-gold hover:underline">
                Reactivate →
              </Link>
            </div>
          </Card>
        )}

        <StatsRow snapshot={snapshot} />

        {/* Body */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="space-y-6">
            <HourlyChart data={snapshot.hourly} />
            <TierBreakdown tiers={snapshot.tiers} />

            {/* Share link */}
            <Card>
              <CardLabel>Event link</CardLabel>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 text-sm text-stamp-orange truncate p-3 bg-stamp-surface2 rounded-md border border-stamp-border">
                  {process.env.NEXT_PUBLIC_APP_URL}/{ev.slug}
                </code>
                <CopyButton text={`${process.env.NEXT_PUBLIC_APP_URL}/${ev.slug}`} />
              </div>
            </Card>

            {/* Scanner link — token-bound, share only with door staff */}
            <Card>
              <CardLabel>Door scanner link</CardLabel>
              <p className="text-xs text-stamp-muted mt-1">
                Send this to whoever's checking tickets at the door. The link
                includes an access token — don't share it publicly.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 text-sm text-stamp-orange truncate p-3 bg-stamp-surface2 rounded-md border border-stamp-border">
                  {process.env.NEXT_PUBLIC_APP_URL}/scan/{ev.id}?token={ev.scanner_secret.slice(0, 8)}…
                </code>
                <CopyButton
                  text={`${process.env.NEXT_PUBLIC_APP_URL}/scan/${ev.id}?token=${ev.scanner_secret}`}
                />
              </div>
            </Card>
          </div>

          <LiveFeed tickets={snapshot.recentTickets} />
        </div>
      </main>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="px-4 py-3 rounded-md border border-stamp-border bg-stamp-surface2 text-sm hover:border-stamp-orange transition-colors"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
