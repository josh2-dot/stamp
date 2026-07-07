import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

// Fraunces — editorial variable serif with real presence at scale.
// We only pull the weights the display scale needs (500 for headlines,
// 600 for the rare "print-num" moment). The opsz/SOFT/WONK axes are
// controlled from globals.css via font-variation-settings.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

// Inter Tight — tighter than stock Inter, keeps its shape against the
// warm cream ground. Body / UI everywhere.
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "STAMP — Campus tickets, verified at the door.",
  description:
    "STAMP is the ticketing platform for Nigerian campus events. Sell, scan, and settle — all in one place.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://stamptickets.ng"),
  openGraph: {
    title: "STAMP — Campus tickets, verified at the door.",
    description: "Sell, scan, and settle Nigerian campus event tickets in one place.",
    type: "website",
  },
};

// Theme color — matches the paper ground so mobile chrome doesn't
// draw a hard seam against the top of the page.
export const viewport: Viewport = {
  themeColor: "#EDE4CE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${interTight.variable}`}>
      {/* paper-grain applies the fixed noise overlay across every route.
          relative + isolate keeps the ::before layer bound to body's
          stacking context so page content (z-10 and up) always paints
          above it. */}
      <body className="bg-stamp-black text-stamp-white font-sans antialiased min-h-screen paper-grain relative isolate">
        {/* Skip-to-content — vermillion pill on cream, matches the CTA
            styling so keyboard users see the site's actual palette. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-stamp-orange focus:text-stamp-black focus:rounded-md focus:font-medium focus:text-sm focus:shadow-stamp-glow"
        >
          Skip to content
        </a>
        <div className="relative z-10">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
