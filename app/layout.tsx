import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
