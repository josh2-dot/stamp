"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";

interface TicketLookupResult {
  id: string;
  status: string;
  buyer_name: string | null;
  buyer_phone: string;
  qr_code: string;
  paystack_ref: string;
  amount_paid: number;
  created_at: string;
  used: boolean;
  used_at: string | null;
  qr_image_url: string | null;
  event_title: string;
  event_venue: string;
  event_date: string;
  tier_name: string;
}

export function TicketLookup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TicketLookupResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setError(null);
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Enter a reference, phone, or QR code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/tickets/search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed.");
        setLoading(false);
        return;
      }
      setResults(data.tickets ?? []);
    } catch (err) {
      console.error(err);
      setError("Network problem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            label="Search"
            placeholder="Paystack ref · phone · QR UUID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleSearch} loading={loading} glow>
            Find
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
          {error}
        </div>
      )}

      {results !== null && results.length === 0 && !error && (
        <p className="text-stamp-muted-2 text-sm text-center py-6">
          No tickets matched.
        </p>
      )}

      {(results ?? []).map((t) => (
        <div
          key={t.id}
          className="p-4 rounded-md border border-stamp-border bg-stamp-surface2 space-y-3"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <Eyebrow>{t.tier_name}</Eyebrow>
              <p className="font-display text-display-xs text-stamp-white mt-1">
                {t.event_title}
              </p>
              <p className="text-stamp-muted-2 text-xs">
                {new Date(t.event_date).toLocaleDateString("en-NG", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · "}
                {t.event_venue}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge tone={t.status === "paid" ? "success" : "warning"}>
                {t.status}
              </Badge>
              {t.used && <Badge tone="default">Scanned</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-3 border-t border-stamp-border">
            <div>
              <p className="text-stamp-muted-2">Buyer</p>
              <p className="text-stamp-white">{t.buyer_name ?? "Anonymous"}</p>
              <p className="text-stamp-muted-2">{t.buyer_phone}</p>
            </div>
            <div>
              <p className="text-stamp-muted-2">Paid</p>
              <p className="text-stamp-white tabular-nums">
                {formatNaira(t.amount_paid)}
              </p>
              <p className="text-stamp-muted-2">
                {new Date(t.created_at).toLocaleString("en-NG")}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-stamp-muted-2">Reference</p>
              <code className="text-stamp-orange text-[11px] break-all">
                {t.paystack_ref}
              </code>
            </div>
            <div className="col-span-2">
              <p className="text-stamp-muted-2">QR code</p>
              <code className="text-stamp-orange text-[11px] break-all">
                {t.qr_code}
              </code>
            </div>
            {t.used_at && (
              <div className="col-span-2">
                <p className="text-stamp-muted-2">Scanned at</p>
                <p className="text-stamp-white">
                  {new Date(t.used_at).toLocaleString("en-NG")}
                </p>
              </div>
            )}
          </div>

          {t.qr_image_url && (
            <a
              href={t.qr_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stamp-orange hover:underline"
            >
              View QR image →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
