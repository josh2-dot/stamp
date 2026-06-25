import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <CardLabel className="!text-center">Pricing</CardLabel>
          <h2 className="text-display text-4xl sm:text-5xl mt-3 text-balance">
            One fee. Nothing else.
          </h2>
          <p className="text-stamp-muted mt-4 max-w-md mx-auto">
            No setup fee. No subscription. No surprise deductions when settlement hits your bank.
          </p>
        </div>

        <Card accent elevated className="overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge tone="accent" className="mb-4">
                Per ticket sold
              </Badge>
              <div className="flex items-baseline gap-2">
                <span className="text-display text-6xl text-stamp-orange">₦200</span>
                <span className="text-stamp-muted">+ 3%</span>
              </div>
              <p className="text-stamp-muted text-sm mt-3 max-w-sm">
                Buyer pays the fee on top of your face value. You receive exactly what you set.
              </p>
            </div>

            <ul className="space-y-3 text-sm">
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
                  <span className="text-stamp-green mt-0.5" aria-hidden="true">
                    ✓
                  </span>
                  <span className="text-stamp-white/90">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-stamp-border flex flex-wrap items-center justify-between gap-4">
            <p className="text-stamp-muted text-xs">
              Selling 100 tickets at ₦3,000 each → buyer pays ₦3,290 · you receive ₦300,000.
            </p>
            <a href="https://wa.me/2348012345678">
              <Button>Start an event</Button>
            </a>
          </div>
        </Card>
      </div>
    </section>
  );
}
