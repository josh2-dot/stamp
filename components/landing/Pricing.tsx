import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          {/* Was CardLabel with !text-center override. Eyebrow has align="center"
              as a first-class prop — no more !important escape. */}
          <Eyebrow align="center">Pricing</Eyebrow>
          <h2 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-3 text-balance">
            One fee. Nothing else.
          </h2>
          <p className="text-stamp-muted-2 mt-4 max-w-md mx-auto">
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
                <span className="font-display text-display-xl text-stamp-orange">
                  ₦200
                </span>
                <span className="text-stamp-muted-2">+ 3%</span>
              </div>
              <p className="text-stamp-muted-2 text-sm mt-3 max-w-sm">
                Added silently to the ticket price. Buyers see one number — no surprise fee line at checkout. You receive exactly what you set.
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
                  <span className="text-stamp-white">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-stamp-border flex flex-wrap items-center justify-between gap-4">
            <p className="text-stamp-muted-2 text-xs">
              Setting 100 tickets at ₦3,000 each → you receive ₦300,000 · buyers see ₦3,290 at checkout.
            </p>
            <a href="https://wa.me/2348012345678">
              {/* glow — the one primary action on the pricing card */}
              <Button glow>Start an event</Button>
            </a>
          </div>
        </Card>
      </div>
    </section>
  );
}
