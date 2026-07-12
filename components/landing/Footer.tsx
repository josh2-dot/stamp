import Link from "next/link";
import { StampSeal } from "@/components/ui/StampSeal";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Editorial footer — minimalist. The audit calls out four-column
 * link farms as generic; this collapses to a single, deliberate
 * masthead with a signing-off seal, three concise columns of
 * genuinely useful links, and a footer colophon set as a masthead
 * imprint.
 */
export function Footer() {
  return (
    <footer className="relative bg-stamp-surface2 mt-16 sm:mt-24 pt-14 sm:pt-20 pb-8 sm:pb-12 pb-safe overflow-hidden">
      {/* Watermark seal — offscreen on mobile to reclaim visual clarity */}
      <div
        className="absolute -bottom-24 -left-24 pointer-events-none opacity-[0.05] hidden sm:block"
        aria-hidden="true"
      >
        <StampSeal size={480} tilt />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Masthead */}
        <div className="grid md:grid-cols-12 gap-10 items-start pb-12 sm:pb-16 border-b border-stamp-border">
          <div className="md:col-span-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <StampSeal size={40} />
              <span className="font-display text-[22px] font-semibold text-stamp-white tracking-[-0.02em]">
                Stamp
              </span>
            </div>
            <p className="font-display text-[1.75rem] xs:text-display-sm text-stamp-white/90 max-w-md leading-[1.15] text-balance">
              Ticketing that runs at the speed of a{" "}
              <span className="italic text-stamp-orange">Nigerian door queue</span>.
            </p>
            <p className="text-stamp-muted-2 mt-4 max-w-sm text-sm">
              Built at RSU. Used at RSU. Coming to a campus near you.
            </p>
          </div>

          {/* Link columns — 2-col on mobile (Product/Contact then Legal),
              3-col across on md+. Each anchor has py-1.5 for 44px vert
              hit area without over-inflating the visual weight. */}
          <div className="md:col-span-2 md:col-start-8">
            <Eyebrow className="mb-3 sm:mb-4">Product</Eyebrow>
            <ul className="space-y-1 text-sm">
              <li><a href="#how"     className="block py-1.5 text-stamp-white hover:text-stamp-orange transition-colors">How it works</a></li>
              <li><a href="#pricing" className="block py-1.5 text-stamp-white hover:text-stamp-orange transition-colors">Pricing</a></li>
              <li><Link href="/login" className="block py-1.5 text-stamp-white hover:text-stamp-orange transition-colors">Organizer sign in</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <Eyebrow className="mb-3 sm:mb-4">Contact</Eyebrow>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="https://wa.me/2348012345678" className="block py-1.5 text-stamp-white hover:text-stamp-orange transition-colors">
                  WhatsApp us
                </a>
              </li>
              <li>
                <a href="mailto:hi@stamptickets.ng" className="block py-1.5 text-stamp-white hover:text-stamp-orange transition-colors break-all">
                  hi@stamptickets.ng
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <Eyebrow className="mb-3 sm:mb-4">Legal</Eyebrow>
            <ul className="space-y-1 text-sm">
              <li><Link href="/terms"   className="block py-1.5 text-stamp-white hover:text-stamp-orange transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="block py-1.5 text-stamp-white hover:text-stamp-orange transition-colors">Privacy</Link></li>
            </ul>
          </div>
        </div>

        {/* Colophon — stacks on mobile with the copyright on top. */}
        <div className="pt-6 sm:pt-8 flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-between gap-2 sm:gap-4 sm:items-baseline">
          <p className="text-xs text-stamp-muted">
            © {new Date().getFullYear()} Stamp Tickets · Built in Port Harcourt.
          </p>
          <Eyebrow>RSU · Port Harcourt · Nigeria</Eyebrow>
        </div>
      </div>
    </footer>
  );
}