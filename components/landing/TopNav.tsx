import Link from "next/link";
import { StampSeal } from "@/components/ui/StampSeal";
import { Button } from "@/components/ui/Button";

/**
 * Editorial top nav — no longer absolute-over-hero; sits on the paper
 * ground with a ledger-line at the bottom of the container. The old
 * layout had the nav floating over the hero background grid, which
 * only worked when the grid was doing the heavy visual lifting. On
 * cream, floating nav reads as unmoored — anchor it instead.
 */
export function TopNav() {
  return (
    <header className="sticky top-0 z-40 bg-stamp-black/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between py-4 border-b border-stamp-border/60">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Seal is small — logomark scale per DESIGN.md. Hover
                rotates it slightly, echoing the "hand-stamped" feel. */}
            <StampSeal
              size={32}
              className="transition-transform duration-300 group-hover:-rotate-12"
            />
            {/* Wordmark in Fraunces — the display serif carries the
                brand at every scale. Micro-mono for the register. */}
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-stamp-white">
                Stamp
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-stamp-muted font-medium">
                Tickets
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="#how"
              className="hidden sm:inline-block text-sm text-stamp-muted-2 hover:text-stamp-white transition-colors px-3 py-2"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              className="hidden sm:inline-block text-sm text-stamp-muted-2 hover:text-stamp-white transition-colors px-3 py-2"
            >
              Pricing
            </Link>
            <Link
              href="#trust"
              className="hidden md:inline-block text-sm text-stamp-muted-2 hover:text-stamp-white transition-colors px-3 py-2"
            >
              Trust
            </Link>
            <Link href="/login" className="ml-2">
              <Button variant="secondary" size="sm">
                Organizer sign in
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
