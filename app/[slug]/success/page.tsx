"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StampSeal } from "@/components/ui/StampSeal";
import { Badge } from "@/components/ui/Badge";

type Status = "polling" | "paid" | "timeout" | "failed";

export default function SuccessPage() {
  const params = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const reference = sp.get("reference");

  const [status, setStatus] = useState<Status>("polling");
  const [ticket, setTicket] = useState<{
    qr_code: string;
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

    let cancelled = false;
    const startedAt = Date.now();

    const check = async () => {
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
    <PageShell maxWidth="md">
      {status === "polling" && (
        <div className="text-center space-y-6">
          {/* Seal pulses while we wait for the webhook — the brand mark IS
              the loading state here, not a separate spinner. */}
          <div className="inline-flex items-center justify-center">
            <StampSeal size={140} className="animate-stamp-pulse" accent />
          </div>
          <h1 className="font-display text-display-lg text-stamp-white">
            Stamping your ticket…
          </h1>
          <p className="text-stamp-muted-2">
            Payment confirmed. We're generating your QR and sending it to WhatsApp.
          </p>
          <Badge tone="warning" dot>This takes 5-15 seconds</Badge>
        </div>
      )}

      {status === "paid" && ticket && (
        <div className="space-y-8">
          <div className="text-center space-y-4">
            {/* This is THE seal moment — the buyer's purchase verification.
                Full intensity, biggest in the product alongside the ADMIT screen. */}
            <div className="inline-flex items-center justify-center">
              <StampSeal size={160} className="text-stamp-green" />
            </div>
            <h1 className="font-display text-display-lg text-stamp-white">
              Stamped &amp; sent.
            </h1>
            <p className="text-stamp-muted-2 max-w-md mx-auto">
              We sent the link to{" "}
              <span className="text-stamp-white">{ticket.buyer_phone}</span>.
              Show this QR at the door — or open the link below.
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
              <Eyebrow align="center">{ticket.tier_name}</Eyebrow>
              <p className="font-display text-display-sm text-stamp-white mt-1 text-balance">
                {ticket.event_title}
              </p>
              <p className="text-stamp-muted-2 text-sm mt-1">
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

          {/* Bookmarkable URL — the source-of-truth link. Even if the SMS gets
              deleted and the email goes to spam, this URL is the permanent
              record. Buyer can save, bookmark, or share with a friend who's
              going to the gate on their behalf. */}
          <div className="p-4 rounded-md bg-stamp-surface2 border border-stamp-border text-center">
            <p className="text-xs text-stamp-muted-2 mb-2">
              Bookmark this link — your ticket lives here
            </p>
            <code className="block text-sm text-stamp-orange break-all">
              {typeof window !== "undefined" ? window.location.origin : ""}/t/
              {ticket.qr_code}
            </code>
          </div>

          <p className="text-center text-xs text-stamp-muted-2">
            <Link href={`/${params.slug}`} className="hover:text-stamp-white">
              ← Back to event page
            </Link>
          </p>
        </div>
      )}

      {status === "timeout" && (
        <div className="text-center space-y-4">
          <h1 className="font-display text-display-md text-stamp-white">
            Taking longer than usual
          </h1>
          <p className="text-stamp-muted-2 max-w-md mx-auto">
            Your payment went through, but we haven't finished issuing the ticket yet.
            Check your SMS in a minute — or contact us if it doesn't arrive.
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
          <h1 className="font-display text-display-md text-stamp-white">
            Something's missing
          </h1>
          <p className="text-stamp-muted-2">
            No payment reference was found in the URL.
          </p>
          <Link href={`/${params.slug}`} className="inline-block text-stamp-orange hover:underline">
            ← Try buying again
          </Link>
        </div>
      )}
    </PageShell>
  );
}
