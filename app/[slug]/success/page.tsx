"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { TopNav } from "@/components/landing/TopNav";
import { Card, CardLabel } from "@/components/ui/Card";
import { StampSeal } from "@/components/ui/StampSeal";
import { Badge } from "@/components/ui/Badge";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Status = "polling" | "paid" | "timeout" | "failed";

export default function SuccessPage() {
  const params = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const reference = sp.get("reference");

  const [status, setStatus] = useState<Status>("polling");
  const [ticket, setTicket] = useState<{
    qr_image_url: string | null;
    buyer_name: string | null;
    buyer_phone: string;
    tier_name: string;
    event_title: string;
    event_venue: string;
    event_date: string;
  } | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      return;
    }

    const supabase = createBrowserSupabase();
    let cancelled = false;
    const startedAt = Date.now();

    const check = async () => {
      // Anon client — we expose only the QR image URL and tier label;
      // RLS on tickets table is strict, so we use a public RPC-style read here
      // via the dashboard API as a workaround in V1. For now, just hit a small
      // server endpoint to avoid leaking ticket details.
      const res = await fetch(`/api/tickets/by-reference/${encodeURIComponent(reference)}`);
      if (res.status === 404) {
        if (Date.now() - startedAt > 60_000) {
          if (!cancelled) setStatus("timeout");
          return;
        }
        return;
      }
      const data = await res.json();
      if (data.status === "paid") {
        if (!cancelled) {
          setTicket(data);
          setStatus("paid");
        }
      }
    };

    check();
    const interval = setInterval(() => {
      if (status === "paid") return;
      check();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <>
      <TopNav />
      <main className="max-w-2xl mx-auto px-6 pt-32 pb-24">
        {status === "polling" && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center">
              <StampSeal size={120} className="animate-stamp-pulse" accent />
            </div>
            <h1 className="text-display text-4xl">Stamping your ticket…</h1>
            <p className="text-stamp-muted">
              Payment confirmed. We're generating your QR and sending it to WhatsApp.
            </p>
            <Badge tone="warning" dot>This takes 5-15 seconds</Badge>
          </div>
        )}

        {status === "paid" && ticket && (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center">
                <StampSeal size={96} className="text-stamp-green" />
              </div>
              <h1 className="text-display text-4xl">Stamped & sent.</h1>
              <p className="text-stamp-muted">
                Your ticket is in WhatsApp on{" "}
                <span className="text-stamp-white">{ticket.buyer_phone}</span>.
                Show this QR at the door — or use the one in WhatsApp.
              </p>
            </div>

            <Card accent elevated className="text-center space-y-5">
              {ticket.qr_image_url && (
                <img
                  src={ticket.qr_image_url}
                  alt="Your ticket QR code"
                  className="mx-auto w-64 h-64 rounded-md"
                />
              )}
              <div>
                <CardLabel>{ticket.tier_name}</CardLabel>
                <p className="text-display text-xl mt-1">{ticket.event_title}</p>
                <p className="text-stamp-muted text-sm mt-1">
                  {new Date(ticket.event_date).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Lagos",
                  })}
                  {" · "}
                  {ticket.event_venue}
                </p>
              </div>
            </Card>

            <p className="text-center text-xs text-stamp-muted">
              <Link href={`/${params.slug}`} className="hover:text-stamp-white">
                ← Back to event page
              </Link>
            </p>
          </div>
        )}

        {status === "timeout" && (
          <div className="text-center space-y-4">
            <h1 className="text-display text-3xl">Taking longer than usual</h1>
            <p className="text-stamp-muted max-w-md mx-auto">
              Your payment went through, but we haven't finished issuing the ticket yet.
              Check your WhatsApp in a minute — or contact us if it doesn't arrive.
            </p>
            <a
              href="https://wa.me/2348012345678"
              className="inline-block text-stamp-orange hover:underline"
            >
              Message support →
            </a>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center space-y-4">
            <h1 className="text-display text-3xl">Something's missing</h1>
            <p className="text-stamp-muted">No payment reference was found in the URL.</p>
            <Link href={`/${params.slug}`} className="inline-block text-stamp-orange hover:underline">
              ← Try buying again
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
