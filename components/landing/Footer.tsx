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
    <footer className="relative bg-stamp-surface2 mt-24 pt-20 pb-12 overflow-hidden">
      {/* Watermark seal — sitting in the bottom-left, low opacity,
          rotated. Reads as the paper's imprint. */}
      <div
        className="absolute -bottom-24 -left-24 pointer-events-none opacity-[0.05]"
        aria-hidden="true"
      >
        <StampSeal size={480} tilt />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Masthead — the imprint line above everything else. */}
        <div className="grid md:grid-cols-12 gap-10 items-start pb-16 border-b border-stamp-border">
          <div className="md:col-span-6">
            <div className="flex items-center gap-3 mb-6">
              <StampSeal size={40} />
              <span className="font-display text-[22px] font-semibold text-stamp-white tracking-[-0.02em]">
                Stamp
              </span>
            </div>
            <p className="font-display text-display-sm text-stamp-white/90 max-w-md leading-[1.15] text-balance">
              Ticketing that runs at the speed of a{" "}
              <span className="italic text-stamp-orange">Nigerian door queue</span>.
            </p>
            <p className="text-stamp-muted-2 mt-4 max-w-sm text-sm">
              Built at RSU. Used at RSU. Coming to a campus near you.
            </p>
          </div>

          <div className="md:col-span-2 md:col-start-8">
            <Eyebrow className="mb-4">Product</Eyebrow>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#how"     className="text-stamp-white hover:text-stamp-orange transition-colors">How it works</a></li>
              <li><a href="#pricing" className="text-stamp-white hover:text-stamp-orange transition-colors">Pricing</a></li>
              <li><Link href="/login" className="text-stamp-white hover:text-stamp-orange transition-colors">Organizer sign in</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <Eyebrow className="mb-4">Contact</Eyebrow>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="https://wa.me/2348012345678" className="text-stamp-white hover:text-stamp-orange transition-colors">
                  WhatsApp us
                </a>
              </li>
              <li>
                <a href="mailto:hi@stamptickets.ng" className="text-stamp-white hover:text-stamp-orange transition-colors">
                  hi@stamptickets.ng
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/terms"   className="text-stamp-white hover:text-stamp-orange transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="text-stamp-white hover:text-stamp-orange transition-colors">Privacy</Link></li>
            </ul>
          </div>
        </div>

        {/* Colophon — set at the bottom like a printer's mark. */}
        <div className="pt-8 flex flex-wrap justify-between gap-4 items-baseline">
          <p className="text-xs text-stamp-muted">
            © {new Date().getFullYear()} Stamp Tickets · Built in Port Harcourt.
          </p>
          <p className="text-[10px] tracking-[0.24em] uppercase text-stamp-muted font-medium">
            RSU · Port Harcourt · Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
}
