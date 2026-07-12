import { Eyebrow } from "@/components/ui/Eyebrow";

const steps = [
  {
    n: "01",
    kicker: "Buyer pays",
    title: "in 30 seconds.",
    body: "Tap your event link. Pick a tier. Enter a phone number. Pay with Paystack — card, transfer, or USSD.",
    detail: "No login. No app to download. No begging for a screenshot.",
  },
  {
    n: "02",
    kicker: "WhatsApp delivers",
    title: "the ticket.",
    body: "Within seconds of payment, the ticket QR lands in the buyer's WhatsApp. SMS kicks in automatically if WhatsApp can't reach them.",
    detail: "Same line they use every day. Nothing to lose.",
  },
  {
    n: "03",
    kicker: "Scan once",
    title: "at the door.",
    body: "Any staff phone becomes a scanner. Tickets light up green or red. The door knows. The dashboard knows. You know.",
    detail: "One scan only — no resold tickets, no duplicates.",
  },
];

/**
 * How it works — broken out of the three-equal-cards AI grid. Each
 * step is a horizontal band with the numeral set enormous on the left
 * and the content flowing across the right two-thirds. The bottom
 * hairline is a ledger-line, not a border-b — it thins toward the
 * edges so section breaks feel like the paper is scored, not framed.
 */
export function HowItWorks() {
  return (
    <section id="how" className="relative py-16 sm:py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-16 mb-12 sm:mb-20 items-end">
          <div className="lg:col-span-5">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="font-display text-[2.25rem] xs:text-display-md sm:text-display-lg text-stamp-white mt-3 sm:mt-4 text-balance leading-[0.95]">
              Three steps.
              <br />
              <span className="italic text-stamp-muted-2">No middlemen.</span>
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="text-stamp-muted-2 text-pretty leading-relaxed text-sm sm:text-base">
              The buyer flow is short on purpose. Every extra step is a
              chance to lose the sale. STAMP is what happens when a
              ticketing platform is designed against Nigerian bandwidth,
              Nigerian phones, and Nigerian door queues — not California ones.
            </p>
          </div>
        </div>

        <ol className="space-y-0">
          {steps.map((s) => (
            <li key={s.n} className="ledger-line">
              <div className="grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10 py-8 sm:py-12">
                {/* Numeral — scaled down on mobile so it doesn't dominate
                    the entire viewport before the reader sees the text. */}
                <div className="lg:col-span-3">
                  <span
                    className="font-display block text-[3.75rem] xs:text-[4.5rem] sm:text-[7rem] leading-[0.85] text-stamp-orange"
                    style={{
                      fontVariationSettings:
                        '"opsz" 144, "SOFT" 40, "WONK" 1',
                    }}
                  >
                    {s.n}
                  </span>
                </div>
                <div className="lg:col-span-6">
                  <p className="text-stamp-muted uppercase text-[10px] sm:text-[11px] tracking-[0.2em] font-medium mb-2 sm:mb-3">
                    Step {s.n}
                  </p>
                  <h3 className="font-display text-[1.35rem] xs:text-display-sm sm:text-[2rem] leading-[1.1] text-stamp-white text-balance">
                    {s.kicker}{" "}
                    <span className="italic text-stamp-muted-2">{s.title}</span>
                  </h3>
                  <p className="text-stamp-white/90 mt-3 sm:mt-5 leading-relaxed max-w-lg text-sm sm:text-base text-pretty">
                    {s.body}
                  </p>
                </div>
                <div className="lg:col-span-3 lg:pt-8">
                  <div className="border-l-2 border-stamp-orange/60 pl-3 sm:pl-4">
                    <p className="text-stamp-muted-2 text-sm italic leading-relaxed text-pretty">
                      {s.detail}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}