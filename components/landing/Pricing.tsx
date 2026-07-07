import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StampSeal } from "@/components/ui/StampSeal";

/**
 * Pricing — one tier, done editorially. The old version was already
 * a single card, which is right. What was missing: the price didn't
 * feel like a decision, it felt like a spec. Now the "₦200 + 3%" is
 * the visual centrepiece, with the fee mechanics explained in prose
 * alongside a receipt calculation, and the CTA sits at the ledger
 * line below.
 */
export function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <Eyebrow align="center">The pricing page</Eyebrow>
          <h2 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-4 text-balance">
            One fee. <span className="italic text-stamp-muted-2">Nothing else.</span>
          </h2>
          <p className="text-stamp-muted-2 mt-5 max-w-md mx-auto leading-relaxed">
            No setup fee. No subscription. No surprise deductions when
            settlement hits your bank.
          </p>
        </div>

        <Card accent elevated className="overflow-hidden">
          <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 items-start">
            {/* ---- Left: the number ---- */}
            <div className="relative">
              <Eyebrow tone="accent">Per ticket sold</Eyebrow>
              <div className="flex items-baseline gap-3 mt-4">
                <span
                  className="font-display print-num text-stamp-orange leading-none text-[5.5rem] sm:text-[6.5rem]"
                  style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1' }}
                >
                  ₦200
                </span>
                <span className="font-display text-display-sm text-stamp-white/70 italic">
                  + 3%
                </span>
              </div>
              <p className="text-stamp-muted-2 text-sm mt-5 max-w-sm leading-relaxed">
                Added silently to the ticket price. Buyers see one number —
                no surprise fee line at checkout. You receive exactly what
                you set.
              </p>

              {/* Receipt — literal arithmetic to make the fee model
                  concrete. Tabular numerals so the columns line up. */}
              <div className="mt-8 p-4 border-t border-b border-stamp-border">
                <Eyebrow>You set</Eyebrow>
                <div className="mt-2 space-y-1.5 text-sm print-num">
                  <div className="flex justify-between text-stamp-white">
                    <span>100 tickets</span>
                    <span>@ ₦3,000</span>
                  </div>
                  <div className="flex justify-between text-stamp-white/80">
                    <span>Buyer pays</span>
                    <span>₦3,290</span>
                  </div>
                  <div className="flex justify-between font-medium text-stamp-orange pt-1.5 border-t border-stamp-border">
                    <span>You receive</span>
                    <span>₦300,000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Right: what's in ---- */}
            <ul className="space-y-3.5 text-sm md:pt-1">
              {[
                "Unlimited events",
                "Unlimited ticket tiers",
                "Live realtime dashboard",
                "WhatsApp + SMS delivery",
                "Door scanner on any phone",
                "24h settlement to Nigerian bank",
                "No setup fees, ever",
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 shrink-0 w-4 h-4 rounded-sm border border-stamp-orange/50 grid place-items-center text-stamp-orange"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                      <path d="M2 6.5 L4.5 9 L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-stamp-white">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 pt-6 border-t border-stamp-border flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-stamp-muted-2 max-w-md leading-relaxed">
              <span className="text-stamp-white font-medium">
                Ready to run an event?
              </span>{" "}
              We onboard you personally over WhatsApp — no forms, no waiting queue.
            </div>
            <a href="https://wa.me/2348012345678">
              <Button glow>Start an event →</Button>
            </a>
          </div>

          {/* Corner mark — the seal at low opacity, bottom-right,
              signing off the pricing card as a formal document. */}
          <div className="absolute -bottom-4 -right-4 opacity-[0.06] pointer-events-none">
            <StampSeal size={140} tilt centerText="STAMP" footerText="OFFICIAL" />
          </div>
        </Card>
      </div>
    </section>
  );
}
