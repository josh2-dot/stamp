import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StampSeal } from "@/components/ui/StampSeal";

export const metadata = {
  title: "Not stamped — STAMP",
  description: "This page doesn't exist.",
};

/**
 * Branded 404 — reads as an unfranked envelope. The seal is present
 * but muted (the ink was never applied), sized larger than the seal
 * moments on other pages so this reads as "absence of stamp" rather
 * than another verification ceremony.
 */
export default function NotFound() {
  return (
    <PageShell maxWidth="md">
      <div className="text-center space-y-10 pt-6">
        {/* The un-stamped seal — muted, off-centre by a hair. */}
        <div className="flex justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-display text-[9rem] leading-none text-stamp-muted/25 italic">
              404
            </span>
          </div>
          <div className="text-stamp-muted opacity-60 relative">
            <StampSeal size={160} tilt centerText=" " footerText="NO STAMP" arcText="RETURN TO SENDER · NOT DELIVERED · " />
          </div>
        </div>

        <div className="space-y-4">
          <Eyebrow align="center">Page not found</Eyebrow>
          <h1 className="font-display text-display-lg text-stamp-white text-balance">
            This page was <span className="italic text-stamp-orange">never stamped</span>.
          </h1>
          <p className="text-stamp-muted-2 text-base max-w-md mx-auto pt-2 leading-relaxed">
            The link might be wrong, the event might have ended, or the page
            might have moved. Pick a route below to get back to something real.
          </p>
        </div>

        {/* Three exit routes, laid out as a horizontal ledger. Each is
            a small labelled card — the destination is the point, not
            the wrapper style. */}
        <div className="grid sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
          {[
            { href: "/",          eyebrow: "Home",      label: "stamptickets.ng" },
            { href: "/dashboard", eyebrow: "Dashboard", label: "Your events" },
            { href: "https://wa.me/2348012345678", eyebrow: "Support", label: "WhatsApp us" },
          ].map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="group block p-4 rounded-md border border-stamp-border bg-stamp-surface hover:border-stamp-white/40 hover:-translate-y-0.5 transition-all text-left"
            >
              <Eyebrow>{route.eyebrow}</Eyebrow>
              <p className="text-sm text-stamp-white mt-3 flex items-center justify-between">
                {route.label}
                <span aria-hidden="true" className="text-stamp-muted-2 group-hover:text-stamp-orange transition-colors">
                  →
                </span>
              </p>
            </Link>
          ))}
        </div>

        <div className="pt-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to home
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
