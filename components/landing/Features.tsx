import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * The product — a five-tile bento, kept from the previous version
 * but recomposed. The dashboard preview earns the accent + col-span-2
 * because it's the "watch it happen" moment. The WhatsApp receipt
 * card gets a real chat bubble. Anti-fraud / settlement / offline
 * are the three cornerstones that pay off the trust promise.
 *
 * Section background is the deeper cream tier to punctuate the
 * transition from HowItWorks. Cards ride on stamp-black again for
 * inner contrast.
 */
export function Features() {
  return (
<<<<<<< HEAD
    <section id="trust" className="py-24 lg:py-32 bg-stamp-surface">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-8 mb-16 items-end">
          <div className="lg:col-span-6">
            <Eyebrow>The product</Eyebrow>
            <h2 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-4 text-balance">
=======
    <section id="trust" className="py-16 sm:py-24 lg:py-32 bg-stamp-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 mb-10 sm:mb-16 items-end">
          <div className="lg:col-span-6">
            <Eyebrow>The product</Eyebrow>
            <h2 className="font-display text-[2.25rem] xs:text-display-md sm:text-display-lg text-stamp-white mt-3 sm:mt-4 text-balance leading-[0.95]">
>>>>>>> 6054257 (stamp mobile ui)
              Built for how Nigerian campus events{" "}
              <span className="italic">actually</span> work.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
<<<<<<< HEAD
            <p className="text-stamp-muted-2 leading-relaxed text-pretty">
=======
            <p className="text-stamp-muted-2 leading-relaxed text-pretty text-sm sm:text-base">
>>>>>>> 6054257 (stamp mobile ui)
              Every design decision started as a scar from running a real
              event at Rivers State University. What follows is what
              survived contact with the door.
            </p>
          </div>
        </div>

<<<<<<< HEAD
        {/* Bento — 3 columns on desktop, first card spans 2 cols x 1 row.
            Rows do not force equal heights; short cards sit shorter. */}
        <div className="grid md:grid-cols-3 gap-4 auto-rows-min">
=======
        {/* Bento — single column on mobile, 3 columns md+. First tile
            still gets col-span-2 on md+. */}
        <div className="grid md:grid-cols-3 gap-3 sm:gap-4 auto-rows-min">
>>>>>>> 6054257 (stamp mobile ui)
          {/* ---- Dashboard preview (accent, col-span-2) ---- */}
          <Card
            accent
            elevated
            className="md:col-span-2 flex flex-col justify-between min-h-[300px] bg-stamp-black"
          >
            <div>
              <Eyebrow>Live revenue ledger</Eyebrow>
              <h3 className="font-display text-display-sm text-stamp-white mt-3 max-w-md text-balance">
                Watch tickets sell in real time.
                <span className="italic text-stamp-muted-2"> Open it on stage at the door.</span>
              </h3>
            </div>
            <DashboardMini />
          </Card>

          {/* ---- WhatsApp delivery ---- */}
          <Card className="flex flex-col bg-stamp-black">
            <Eyebrow tone="accent">WhatsApp first</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-3 text-balance">
              Tickets land where buyers already are.
            </h3>
            <p className="text-stamp-muted-2 text-sm mt-3 leading-relaxed">
              99% open rate. SMS fallback if WhatsApp fails. Never email-only.
            </p>
            {/* Chat-bubble receipt — right-aligned like the buyer's own
                outgoing message thread. */}
            <div className="mt-5 flex justify-end">
              <div className="max-w-[220px] p-3 bg-[#DCF8C6] text-[#111] rounded-lg rounded-br-none text-[13px] leading-snug relative">
                <p className="font-semibold text-[#075E54] mb-1">🎟 STAMP · your ticket</p>
                <p className="font-semibold text-[#111]">Lagos Carnival Pre-game</p>
                <p className="text-[#3C3C3C] mt-0.5">Fri 12 Jul · 7:00pm</p>
                <p className="text-[#3C3C3C]">SUB Field, RSU</p>
                <p className="text-[10px] text-[#667781] mt-2 text-right">8:41 pm ✓✓</p>
              </div>
            </div>
          </Card>

          {/* ---- Anti-fraud ---- */}
          <Card className="bg-stamp-black">
            <Eyebrow>Anti-fraud QR</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-3">
              One scan only.
            </h3>
            <p className="text-stamp-muted-2 text-sm mt-3 leading-relaxed">
              Every ticket is a unique UUID, marked used the instant the
              scanner sees it. Screenshots don't work twice.
            </p>
          </Card>

          {/* ---- Settlement ---- */}
          <Card className="bg-stamp-black">
            <Eyebrow>24h settlement</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-3">
              Money in your bank, fast.
            </h3>
            <p className="text-stamp-muted-2 text-sm mt-3 leading-relaxed">
              We hold nothing. After the event, payouts settle to your
              registered Nigerian bank within 24 hours.
            </p>
          </Card>

          {/* ---- Offline tolerant ---- */}
          <Card className="bg-stamp-black">
            <Eyebrow>Door works offline</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-3">
              Network drops, the gate keeps moving.
            </h3>
            <p className="text-stamp-muted-2 text-sm mt-3 leading-relaxed">
              The scanner caches the ticket list on the door device.
              Reception can vanish and verification keeps working.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

/**
 * Tiny bar chart preview. Vermillion ramp — most recent tallest and
 * fully opaque, older columns fade back. Left column has a single
 * "just now" tick label; right column shows the last-hour lift.
 */
function DashboardMini() {
  const bars = [12, 24, 18, 32, 28, 45, 38, 52, 60, 48, 70, 65];
  const lastIdx = bars.length - 1;
  return (
    <div className="mt-6 grid grid-cols-[1fr_auto] gap-8 items-end">
      <div>
        <div className="flex items-end gap-1 h-24 mb-2">
          {bars.map((h, i) => {
            const recency = i / lastIdx;
            const opacity = 0.18 + recency * 0.82;
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${h}%`,
                  background: `rgba(192, 51, 26, ${opacity})`,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-stamp-muted uppercase tracking-[0.16em]">
          <span>5:00 pm</span>
          <span className="text-stamp-orange">Just now</span>
        </div>
      </div>
      <div className="text-right pb-6">
        <Eyebrow>Last hour</Eyebrow>
        <p className="font-display print-num text-display-sm text-stamp-orange mt-2 leading-none">
          +₦24k
        </p>
        <p className="text-[11px] text-stamp-muted-2 mt-1.5 uppercase tracking-[0.1em]">
          17 tickets
        </p>
      </div>
    </div>
  );
}
