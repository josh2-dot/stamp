"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { TierBreakdown } from "@/components/dashboard/TierBreakdown";
import { HourlyChart } from "@/components/dashboard/HourlyChart";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { CompTicketCard } from "@/components/dashboard/CompTicketCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
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
          fetchSnapshot();
          setPulse((p) => p + 1);
        },
      )
      .subscribe();

    const interval = setInterval(fetchSnapshot, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (error) {
    return (
      <PageShell maxWidth="md">
        <div className="text-center">
          <h1 className="font-display text-display-md text-stamp-white">
            Couldn't load dashboard
          </h1>
          <p className="text-stamp-muted-2 mt-3">{error}</p>
          <Link href="/dashboard" className="text-stamp-orange mt-6 inline-block hover:underline">
            ← Back to events
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!snapshot) {
    return (
      <PageShell>
        <div className="space-y-4 animate-stamp-pulse">
          <div className="h-8 w-64 bg-stamp-surface rounded-md" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-stamp-surface rounded-lg" />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  const ev = snapshot.event;

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Link href="/dashboard" className="text-xs text-stamp-muted-2 hover:text-stamp-white transition-colors">
              ← All events
            </Link>
            <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2 text-balance">
              {ev.title}
            </h1>
            <p className="text-stamp-muted-2 text-sm mt-1">
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
            {/* Live here = active sales (not gate verification). Default tone + dot. */}
            <Badge
              tone={ev.is_active ? "default" : "warning"}
              dot={ev.is_active}
              key={pulse}
            >
              {ev.is_active ? "Live" : "Deactivated"}
            </Badge>
            <Link href={`/dashboard/events/${ev.id}/edit`} className="text-sm text-stamp-muted-2 hover:text-stamp-white transition-colors">
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
          // tone="warning" handles the border. The bg-stamp-gold/5 fill that
          // used to live here was the second half of a duplicate signal —
          // border + fill + eyebrow color all said the same thing. Border-
          // only is enough.
          <Card tone="warning">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Eyebrow tone="warning">Event deactivated</Eyebrow>
                <p className="text-sm mt-1 text-stamp-white">
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
              <Eyebrow>Event link</Eyebrow>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 text-sm text-stamp-orange truncate p-3 bg-stamp-surface2 rounded-md border border-stamp-border">
                  {process.env.NEXT_PUBLIC_APP_URL}/{ev.slug}
                </code>
                <CopyButton text={`${process.env.NEXT_PUBLIC_APP_URL}/${ev.slug}`} />
              </div>
            </Card>

            {/* Scanner link — token-bound, share only with door staff */}
            <Card>
              <Eyebrow>Door scanner link</Eyebrow>
              <p className="text-xs text-stamp-muted-2 mt-1">
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

            <CompTicketCard
              eventId={ev.id}
              tiers={snapshot.tiers}
              onIssued={fetchSnapshot}
            />

            {/* Awards module — quiet entry point. When awards are
                enabled, shows a status line; when not, an invitation. */}
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Eyebrow>Awards</Eyebrow>
                  <p className="text-xs text-stamp-muted-2 mt-1">
                    {ev.awards_enabled
                      ? "Run nominations, voting, and reveal."
                      : "Add voting for Best Dressed, MC of the Year, etc."}
                  </p>
                </div>
                <Link href={`/dashboard/events/${ev.id}/awards`}>
                  <Button size="sm" variant="ghost">
                    {ev.awards_enabled ? "Manage →" : "Set up →"}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <LiveFeed tickets={snapshot.recentTickets} />
        </div>
      </div>
    </PageShell>
  );
}

function CopyButtonLegacy_REMOVED({ text }: { text: string }) {
  return null;
}
// CopyButton lifted to @/components/ui/CopyButton
