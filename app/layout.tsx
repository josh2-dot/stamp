import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "STAMP — Campus tickets, verified.",
  description:
    "STAMP is the ticketing platform for Nigerian campus events. Sell, scan, and settle — all in one place.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://stamptickets.ng"),
  openGraph: {
    title: "STAMP — Campus tickets, verified.",
    description: "Sell, scan, and settle Nigerian campus event tickets in one place.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="bg-stamp-black text-stamp-white font-sans antialiased min-h-screen">
        {/* Skip-to-content link — visually hidden until keyboard-focused,
            then materializes top-left as the first tab stop on every page.
            Targets #main, which PageShell now applies to its <main>. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-stamp-orange focus:text-stamp-black focus:rounded-md focus:font-medium focus:text-sm focus:shadow-stamp-glow"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
