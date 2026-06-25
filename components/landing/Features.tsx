import { Card, CardLabel } from "@/components/ui/Card";

export function Features() {
  return (
    <section className="py-24 lg:py-32 bg-stamp-surface/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <CardLabel>The product</CardLabel>
          <h2 className="text-display text-4xl sm:text-5xl mt-3 text-balance">
            Built for how Nigerian campus events actually work.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Big card — live dashboard */}
          <Card className="md:col-span-2 md:row-span-1 flex flex-col justify-between min-h-[280px]">
            <div>
              <CardLabel>Live revenue dashboard</CardLabel>
              <h3 className="text-display text-2xl mt-3 max-w-md">
                Watch tickets sell in real time. Open it on stage at the door.
              </h3>
            </div>
            <DashboardMini />
          </Card>

          {/* WhatsApp delivery */}
          <Card className="flex flex-col">
            <CardLabel>WhatsApp first</CardLabel>
            <h3 className="text-display text-2xl mt-3">
              Tickets land where buyers already are.
            </h3>
            <p className="text-stamp-muted text-sm mt-4 leading-relaxed">
              99% open rate. SMS fallback if WhatsApp fails. Never email-only.
            </p>
            <div className="mt-6 p-4 rounded-md bg-stamp-surface2 border border-stamp-border text-sm">
              <p className="text-stamp-green">🎟 Your STAMP ticket</p>
              <p className="text-stamp-white/80 mt-1 text-xs">
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
            <CardLabel>Anti-fraud QR</CardLabel>
            <h3 className="text-display text-xl mt-3">One scan only.</h3>
            <p className="text-stamp-muted text-sm mt-3 leading-relaxed">
              Every ticket is a unique UUID, marked used the instant the
              scanner sees it. Screenshots don't work twice.
            </p>
          </Card>

          {/* Settlement */}
          <Card>
            <CardLabel>24h settlement</CardLabel>
            <h3 className="text-display text-xl mt-3">
              Money in your bank, fast.
            </h3>
            <p className="text-stamp-muted text-sm mt-3 leading-relaxed">
              We hold nothing. After the event, payouts settle to your
              registered Nigerian bank within 24 hours.
            </p>
          </Card>

          {/* Offline tolerant */}
          <Card>
            <CardLabel>Door works offline</CardLabel>
            <h3 className="text-display text-xl mt-3">
              Network drops, the gate keeps moving.
            </h3>
            <p className="text-stamp-muted text-sm mt-3 leading-relaxed">
              The scanner caches the ticket list on the door device. Reception
              can vanish and verification keeps working.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

/** Tiny in-card dashboard preview — pure SVG, no data */
function DashboardMini() {
  const bars = [12, 24, 18, 32, 28, 45, 38, 52, 60, 48, 70, 65];
  return (
    <div className="mt-6 grid grid-cols-[1fr_auto] gap-6 items-end">
      <div className="flex items-end gap-1 h-24">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${h}%`,
              background:
                i === bars.length - 1
                  ? "#FF5C1A"
                  : i === bars.length - 2
                  ? "#F5C842"
                  : "#252538",
            }}
          />
        ))}
      </div>
      <div className="text-right">
        <p className="text-xs text-stamp-muted uppercase tracking-[0.2em]">
          Last hour
        </p>
        <p className="text-display text-3xl text-stamp-orange mt-1">+₦24k</p>
      </div>
    </div>
  );
}
