import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function Features() {
  return (
    <section className="py-24 lg:py-32 bg-stamp-surface/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <Eyebrow>The product</Eyebrow>
          <h2 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-3 text-balance">
            Built for how Nigerian campus events actually work.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Big card — live dashboard. `accent` here is the one focal card
              for this section's viewport. */}
          <Card accent className="md:col-span-2 md:row-span-1 flex flex-col justify-between min-h-[280px]">
            <div>
              <Eyebrow>Live revenue dashboard</Eyebrow>
              <h3 className="font-display text-display-sm text-stamp-white mt-3 max-w-md text-balance">
                Watch tickets sell in real time. Open it on stage at the door.
              </h3>
            </div>
            <DashboardMini />
          </Card>

          {/* WhatsApp delivery — emoji here is authentic to the medium
              (literal WhatsApp message preview), not decorative UI chrome. */}
          <Card className="flex flex-col">
            <Eyebrow>WhatsApp first</Eyebrow>
            <h3 className="font-display text-display-sm text-stamp-white mt-3">
              Tickets land where buyers already are.
            </h3>
            <p className="text-stamp-muted-2 text-sm mt-4 leading-relaxed">
              99% open rate. SMS fallback if WhatsApp fails. Never email-only.
            </p>
            <div className="mt-6 p-4 rounded-md bg-stamp-surface2 border border-stamp-border text-sm">
              <p className="text-stamp-green">🎟 Your STAMP ticket</p>
              <p className="text-stamp-muted-2 mt-1 text-xs">
                <b className="text-stamp-white">Lagos Carnival Pre-game</b>
                <br />
                📅 Fri 12 July · 7:00pm
                <br />
                📍 SUB Field, RSU
              </p>
            </div>
          </Card>

          {/* Anti-fraud */}
          <Card>
            <Eyebrow>Anti-fraud QR</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-3">
              One scan only.
            </h3>
            <p className="text-stamp-muted-2 text-sm mt-3 leading-relaxed">
              Every ticket is a unique UUID, marked used the instant the
              scanner sees it. Screenshots don't work twice.
            </p>
          </Card>

          {/* Settlement */}
          <Card>
            <Eyebrow>24h settlement</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-3">
              Money in your bank, fast.
            </h3>
            <p className="text-stamp-muted-2 text-sm mt-3 leading-relaxed">
              We hold nothing. After the event, payouts settle to your
              registered Nigerian bank within 24 hours.
            </p>
          </Card>

          {/* Offline tolerant */}
          <Card>
            <Eyebrow>Door works offline</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-3">
              Network drops, the gate keeps moving.
            </h3>
            <p className="text-stamp-muted-2 text-sm mt-3 leading-relaxed">
              The scanner caches the ticket list on the door device. Reception
              can vanish and verification keeps working.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

/**
 * Tiny in-card dashboard preview — monochrome orange ramp (latest = full,
 * older = faded) per the audit. The gold-bar-as-garnish was meaning-loaded
 * (gold is reserved for warnings in DESIGN.md), so it had to go.
 */
function DashboardMini() {
  const bars = [12, 24, 18, 32, 28, 45, 38, 52, 60, 48, 70, 65];
  const lastIdx = bars.length - 1;
  return (
    <div className="mt-6 grid grid-cols-[1fr_auto] gap-6 items-end">
      <div className="flex items-end gap-1 h-24">
        {bars.map((h, i) => {
          // Most recent bar = full orange; gradient falls off with age.
          const recency = i / lastIdx; // 0 at oldest, 1 at most recent
          const opacity = 0.15 + recency * 0.85;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                background: `rgba(255, 92, 26, ${opacity})`,
              }}
            />
          );
        })}
      </div>
      <div className="text-right">
        <Eyebrow>Last hour</Eyebrow>
        <p className="font-display text-display-sm text-stamp-orange mt-1">
          +₦24k
        </p>
      </div>
    </div>
  );
}
