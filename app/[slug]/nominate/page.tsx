"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StampSeal } from "@/components/ui/StampSeal";

interface PublicCategory {
  id: string;
  label: string;
  phase: string;
  vote_price_kobo: number;
  nominations_close_at: string | null;
}

interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  venue: string;
  event_date: string;
  awards_enabled: boolean;
}

interface FeedShape {
  event: PublicEvent;
  categories: PublicCategory[];
}

/**
 * Public nomination form. All categories in 'nominations_open' phase
 * shown on one page — nominator fills the ones they care about, leaves
 * the rest blank. Single submit at bottom.
 *
 * Design intent: this is a friendly social moment ("who's special to
 * you?"), not an admin form. We lean into that with the stamp seal in
 * the header, friendly micro-copy, and a satisfying confirmation state
 * that names the people who got nominated.
 */
export default function NominatePage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<FeedShape | null>(null);
  const [phone, setPhone] = useState("");
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ names: Array<{ category: string; nominee: string }> } | null>(null);

  useEffect(() => {
    fetch(`/api/awards/event/${params.slug}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setError("Couldn't load this event."));
  }, [params.slug]);

  if (!data) {
    return (
      <PageShell maxWidth="md">
        <p className="text-stamp-muted-2 text-sm">Loading…</p>
      </PageShell>
    );
  }

  const openCategories = data.categories.filter(
    (c) => c.phase === "nominations_open",
  );

  if (!data.event.awards_enabled || openCategories.length === 0) {
    return (
      <PageShell maxWidth="md">
        <Card className="text-center py-12">
          <Eyebrow align="center">Nominations</Eyebrow>
          <h1 className="font-display text-display-md text-stamp-white mt-3">
            Nominations are closed.
          </h1>
          <p className="text-stamp-muted-2 text-sm mt-3 max-w-md mx-auto">
            Either nominations haven't opened yet for {data.event.title}, or they've already closed. Check the event page for voting.
          </p>
          <a
            href={`/${params.slug}`}
            className="inline-block mt-6 text-sm text-stamp-orange hover:underline"
          >
            View event →
          </a>
        </Card>
      </PageShell>
    );
  }

  if (success) {
    return (
      <PageShell maxWidth="md">
        <Card accent elevated className="text-center py-12 space-y-6">
          <div className="flex justify-center text-stamp-green">
            <StampSeal size={140} />
          </div>
          <div>
            <Eyebrow align="center">Nominations in</Eyebrow>
            <h1 className="font-display text-display-md text-stamp-white mt-3">
              Thanks for nominating.
            </h1>
          </div>
          <ul className="space-y-2 max-w-sm mx-auto text-left">
            {success.names.map((n, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 text-sm py-2 border-b border-stamp-border last:border-0"
              >
                <span className="text-stamp-white">{n.nominee}</span>
                <span className="text-xs text-stamp-muted-2">{n.category}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stamp-muted-2 max-w-sm mx-auto">
            Voting opens after the organizer locks the ballot. Watch this space.
          </p>
          <a
            href={`/${params.slug}`}
            className="inline-block text-sm text-stamp-orange hover:underline"
          >
            ← Back to {data.event.title}
          </a>
        </Card>
      </PageShell>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    if (!phone.trim()) {
      setError("Add your phone number first.");
      return;
    }
    const nominations = openCategories
      .map((c) => ({
        category_id: c.id,
        nominee_name: entries[c.id]?.trim() ?? "",
      }))
      .filter((n) => n.nominee_name.length >= 2);

    if (nominations.length === 0) {
      setError("Fill in at least one nominee.");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/awards/nominations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: data.event.id,
        nominator_phone: phone.trim(),
        nominations,
      }),
    });
    const resp = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(resp.error || "Couldn't submit. Try again.");
      return;
    }

    setSuccess({
      names: nominations.map((n) => ({
        nominee: n.nominee_name,
        category:
          openCategories.find((c) => c.id === n.category_id)?.label ?? "",
      })),
    });
  };

  return (
    <PageShell maxWidth="md">
      <div className="mb-10">
        <Eyebrow>Nominations</Eyebrow>
        <h1 className="font-display text-display-lg text-stamp-white mt-2 text-balance">
          Who deserves it?
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-3 max-w-md">
          Nominations for <span className="text-stamp-white">{data.event.title}</span>. Fill in only the categories you care about — leave the rest blank.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <Input
            label="Your phone number"
            placeholder="0801234..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            hint="We use this to prevent double-submissions, not to contact you."
          />
        </Card>

        <div className="space-y-3">
          {openCategories.map((c, idx) => (
            <Card key={c.id}>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-stamp-muted-2 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <Eyebrow>{c.label}</Eyebrow>
                </div>
              </div>
              <Input
                placeholder="Type a name…"
                value={entries[c.id] ?? ""}
                onChange={(e) =>
                  setEntries((p) => ({ ...p, [c.id]: e.target.value }))
                }
              />
            </Card>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button glow size="lg" onClick={handleSubmit} loading={busy} className="w-full">
            Submit nominations →
          </Button>
          <p className="text-xs text-stamp-muted-2 text-center mt-3">
            One nomination per name per category. Duplicates are quietly dropped.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
