import { Card, CardLabel } from "@/components/ui/Card";

const steps = [
  {
    n: "01",
    title: "Buyer pays in 30 seconds",
    body: "Tap your event link. Pick a tier. Enter a phone number. Pay with Paystack — card, transfer, or USSD.",
    detail: "No login. No app to download. No begging for a screenshot.",
  },
  {
    n: "02",
    title: "WhatsApp delivers the ticket",
    body: "Within seconds of payment, the ticket QR lands in the buyer's WhatsApp. SMS kicks in automatically if WhatsApp can't reach them.",
    detail: "Same line they use every day. Nothing to lose.",
  },
  {
    n: "03",
    title: "Scan once at the door",
    body: "Any staff phone becomes a scanner. Tickets light up green or red. The door knows. The dashboard knows. You know.",
    detail: "One scan only — no resold tickets, no duplicates.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <CardLabel>How it works</CardLabel>
          <h2 className="text-display text-4xl sm:text-5xl mt-3 text-balance">
            Three steps. No middlemen.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <Card key={s.n} accent className="flex flex-col h-full">
              <span className="text-display text-stamp-orange text-2xl mb-6">
                {s.n}
              </span>
              <h3 className="text-display text-xl mb-3 text-balance">{s.title}</h3>
              <p className="text-stamp-white/80 text-sm leading-relaxed">{s.body}</p>
              <p className="text-stamp-muted text-xs mt-4 pt-4 border-t border-stamp-border italic">
                {s.detail}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
