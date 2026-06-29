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
 * Branded 404. Uses the seal as the visual anchor — desaturated, sized
 * smaller than the verification moments so it reads as "absence of stamp"
 * rather than another verification ceremony. The body copy explains the
 * three real ways a visitor might get here, with a way back from each.
 */
export default function NotFound() {
  return (
    <PageShell maxWidth="md">
      <div className="text-center space-y-8 pt-8">
        <div className="flex justify-center text-stamp-muted opacity-60">
          <StampSeal size={140} centerText="404" footerText="NO STAMP" />
        </div>

        <div className="space-y-3">
          <Eyebrow align="center">Page not found</Eyebrow>
          <h1 className="font-display text-display-lg text-stamp-white text-balance">
            This page was never stamped.
          </h1>
          <p className="text-stamp-muted-2 text-sm max-w-md mx-auto pt-2">
            The link might be wrong, the event might have ended, or the page
            might have moved. Pick one of the routes below to get back to
            something real.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-4">
          <Link
            href="/"
            className="block p-4 rounded-md border border-stamp-border bg-stamp-surface hover:border-stamp-muted/40 transition-colors text-left"
          >
            <Eyebrow>Home</Eyebrow>
            <p className="text-sm text-stamp-white mt-2">stamptickets.ng</p>
          </Link>
          <Link
            href="/dashboard"
            className="block p-4 rounded-md border border-stamp-border bg-stamp-surface hover:border-stamp-muted/40 transition-colors text-left"
          >
            <Eyebrow>Dashboard</Eyebrow>
            <p className="text-sm text-stamp-white mt-2">Your events</p>
          </Link>
          <a
            href="https://wa.me/2348012345678"
            className="block p-4 rounded-md border border-stamp-border bg-stamp-surface hover:border-stamp-muted/40 transition-colors text-left"
          >
            <Eyebrow>Support</Eyebrow>
            <p className="text-sm text-stamp-white mt-2">WhatsApp us</p>
          </a>
        </div>

        <div className="pt-2">
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
