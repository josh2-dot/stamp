"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ScanWindow } from "@/components/scanner/ScanWindow";
import { ScanResult } from "@/components/scanner/ScanResult";
import { ScanHistory } from "@/components/scanner/ScanHistory";
import { StampSeal } from "@/components/ui/StampSeal";
import { Badge } from "@/components/ui/Badge";
import { useScannerStore } from "@/store/useScannerStore";
import {
  countPendingScans,
  drainPendingScans,
  loadCache,
  markUsedLocally,
  queueScan,
  saveCache,
} from "@/lib/offline-cache";
import type { VerifyResponse } from "@/types";

type Connectivity = "online" | "offline";
type AuthState = "checking" | "ok" | "missing_token" | "invalid_token";

export default function ScannerPage() {
  const params = useParams<{ eventId: string }>();
  const sp = useSearchParams();
  const token = sp.get("token");

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [eventTitle, setEventTitle] = useState<string>("");
  const [connectivity, setConnectivity] = useState<Connectivity>("online");
  const [pendingCount, setPendingCount] = useState(0);

  const {
    scans,
    current,
    showingResult,
    pushScan,
    setCurrent,
    setShowingResult,
  } = useScannerStore();

  // Hydrate cache + check token validity on mount
  useEffect(() => {
    if (!token) {
      setAuthState("missing_token");
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      try {
        const res = await fetch(
          `/api/events/${params.eventId}/ticket-codes?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (res.status === 403 || res.status === 401) {
          if (!cancelled) setAuthState("invalid_token");
          return;
        }
        if (!res.ok) {
          // Online but the endpoint is unhappy — try the IDB cache
          const cache = await loadCache(params.eventId);
          if (cache && !cancelled) {
            setAuthState("ok");
            setConnectivity("offline");
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setEventTitle(data.eventTitle ?? "");
        setAuthState("ok");
        await saveCache({
          eventId: params.eventId,
          paid: data.paid,
          used: data.used,
          cachedAt: data.cachedAt,
        });
      } catch (err) {
        console.warn("[scanner] hydrate failed, falling back to cache", err);
        const cache = await loadCache(params.eventId);
        if (cache && !cancelled) {
          setAuthState("ok");
          setConnectivity("offline");
        } else if (!cancelled) {
          setAuthState("invalid_token");
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [params.eventId, token]);

  // Connectivity + pending-queue refresh
  useEffect(() => {
    const handleOnline = () => setConnectivity("online");
    const handleOffline = () => setConnectivity("offline");

    if (typeof navigator !== "undefined") {
      setConnectivity(navigator.onLine ? "online" : "offline");
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const refreshPending = async () => {
      const c = await countPendingScans(params.eventId);
      setPendingCount(c);
    };
    refreshPending();

    // Periodic re-fetch of the code list while online — handles new sales mid-event
    let interval: ReturnType<typeof setInterval> | null = null;
    if (token && authState === "ok") {
      interval = setInterval(async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        try {
          const res = await fetch(
            `/api/events/${params.eventId}/ticket-codes?token=${encodeURIComponent(token)}`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const data = await res.json();
            await saveCache({
              eventId: params.eventId,
              paid: data.paid,
              used: data.used,
              cachedAt: data.cachedAt,
            });
          }
        } catch {
          /* offline — handled separately */
        }
      }, 30_000);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (interval) clearInterval(interval);
    };
  }, [params.eventId, token, authState]);

  // When we come back online, replay queued scans (best-effort)
  useEffect(() => {
    if (connectivity !== "online" || !token) return;
    let cancelled = false;

    (async () => {
      const pending = await drainPendingScans(params.eventId);
      if (cancelled || pending.length === 0) return;

      for (const scan of pending) {
        try {
          await fetch(
            `/api/tickets/verify/${encodeURIComponent(scan.qr)}?eventId=${params.eventId}&token=${encodeURIComponent(token)}`,
            { cache: "no-store" },
          );
        } catch {
          // Re-queue if it fails again
          await queueScan(scan.eventId, scan.qr);
        }
      }
      const c = await countPendingScans(params.eventId);
      setPendingCount(c);
    })();

    return () => {
      cancelled = true;
    };
  }, [connectivity, params.eventId, token]);

  const handleScan = useCallback(
    async (qr: string) => {
      if (!token) return;
      let result: VerifyResponse;

      // Try the network path first if we believe we're online
      const tryNetwork =
        typeof navigator === "undefined" || navigator.onLine;

      if (tryNetwork) {
        try {
          const res = await fetch(
            `/api/tickets/verify/${encodeURIComponent(qr)}?eventId=${params.eventId}&token=${encodeURIComponent(token)}`,
            { cache: "no-store" },
          );
          result = (await res.json()) as VerifyResponse;
          if (result.valid) {
            await markUsedLocally(params.eventId, qr);
          }
        } catch {
          result = await offlineVerify(params.eventId, qr);
        }
      } else {
        result = await offlineVerify(params.eventId, qr);
      }

      setCurrent(result);
      setShowingResult(true);
      pushScan({
        id: `${qr}_${Date.now()}`,
        qr,
        at: Date.now(),
        result,
      });

      const c = await countPendingScans(params.eventId);
      setPendingCount(c);

      setTimeout(() => {
        setShowingResult(false);
        setCurrent(null);
      }, 2500);
    },
    [params.eventId, token, pushScan, setCurrent, setShowingResult],
  );

  if (authState === "missing_token" || authState === "invalid_token") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          {/* Seal removed from this empty/error state per DESIGN.md — the seal
              is for verification moments, not "we couldn't get there" screens. */}
          <h1 className="font-display text-display-md text-stamp-white">
            Scanner link incomplete
          </h1>
          <p className="text-stamp-muted-2 text-sm">
            {authState === "missing_token"
              ? "This scanner URL is missing its access token. Open the scanner from your dashboard or ask the organizer for the full link."
              : "This scanner token is invalid or expired. Ask the organizer to re-share the scanner link from their dashboard."}
          </p>
        </div>
      </main>
    );
  }

  if (authState === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          {/* Seal pulse on "preparing scanner" is OK — this is the lead-in to
              a verification surface, so the mark previewing itself is on-brand. */}
          <StampSeal size={80} className="mx-auto animate-stamp-pulse" />
          <p className="text-stamp-muted-2 text-sm">Preparing scanner…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-stamp-black overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stamp-surface/80 backdrop-blur border border-stamp-border min-w-0">
          <StampSeal size={28} className="shrink-0" />
          <span className="text-xs font-medium truncate text-stamp-white">
            {eventTitle || "Scanner"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {connectivity === "offline" && (
            <Badge tone="warning">Offline</Badge>
          )}
          {pendingCount > 0 && (
            <Badge tone="accent">{pendingCount} to sync</Badge>
          )}
          <Badge tone="success" dot>
            {scans.filter((s) => s.result.valid).length} in
          </Badge>
        </div>
      </div>

      {/* Camera region */}
      <div className="flex-1 relative">
        <ScanWindow onScan={handleScan} paused={showingResult} />
      </div>

      {/* History drawer */}
      <ScanHistory scans={scans} />

      {/* Result overlay */}
      {showingResult && current && <ScanResult result={current} />}
    </main>
  );
}

/**
 * Offline verification path. Reads from IndexedDB, marks the ticket used
 * locally (so it won't double-admit at this door), and queues the scan for
 * later sync with the server.
 *
 * Trade-off worth knowing: if two doors are both offline at the same time
 * scanning against the same event, they each have an independent local
 * "used" set. A counterfeit ticket holder could in theory be admitted at
 * both doors. Single-door events (the V1 default at RSU) don't have this
 * problem.
 */
async function offlineVerify(
  eventId: string,
  qr: string,
): Promise<VerifyResponse> {
  const cache = await loadCache(eventId);
  if (!cache) {
    return { valid: false, reason: "invalid" };
  }
  if (!cache.paid.includes(qr)) {
    return { valid: false, reason: "invalid" };
  }
  if (cache.used.includes(qr)) {
    return { valid: false, reason: "already_scanned" };
  }
  await markUsedLocally(eventId, qr);
  await queueScan(eventId, qr);
  return {
    valid: true,
    ticket: {
      id: qr,
      tierName: "Offline verified",
      buyerName: null,
      buyerPhone: "",
    },
  };
}
