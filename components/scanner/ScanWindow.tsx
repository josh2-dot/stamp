"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, type ComponentType } from "react";
import type { QrScannerProps } from "react-qr-scanner";

// react-qr-scanner is client-only and requires window.navigator.mediaDevices
const QrScanner = dynamic(
  () => import("react-qr-scanner").then((m) => m.default),
  { ssr: false },
) as unknown as ComponentType<QrScannerProps>;

interface ScanWindowProps {
  onScan: (qr: string) => void;
  paused: boolean;
}

export function ScanWindow({ onScan, paused }: ScanWindowProps) {
  const lastScanRef = useRef<{ qr: string; at: number } | null>(null);

  useEffect(() => {
    if (!paused) lastScanRef.current = null;
  }, [paused]);

  const handleScan = (data: { text: string } | string | null) => {
    if (!data || paused) return;
    const text = typeof data === "string" ? data : data.text;
    if (!text) return;

    // Debounce duplicate scans within 1.5s
    const last = lastScanRef.current;
    if (last && last.qr === text && Date.now() - last.at < 1500) return;
    lastScanRef.current = { qr: text, at: Date.now() };

    onScan(text);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!paused && (
        <QrScanner
          delay={200}
          onScan={handleScan}
          onError={(err: unknown) => console.error("[scanner]", err)}
          constraints={{
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* Reticle overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[70vmin] h-[70vmin] max-w-[400px] max-h-[400px]">
          {/* Corners */}
          {[
            "top-0 left-0 border-t-4 border-l-4",
            "top-0 right-0 border-t-4 border-r-4",
            "bottom-0 left-0 border-b-4 border-l-4",
            "bottom-0 right-0 border-b-4 border-r-4",
          ].map((pos, i) => (
            <span
              key={i}
              className={`absolute w-10 h-10 border-stamp-orange ${pos}`}
              aria-hidden="true"
            />
          ))}

          {/* Scan sweep line */}
          <span
            className="absolute left-0 right-0 h-px bg-stamp-orange shadow-[0_0_12px_2px_rgba(255,92,26,0.6)] animate-scan-sweep"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Dark vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 40%, rgba(10,10,20,0.85) 100%)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
