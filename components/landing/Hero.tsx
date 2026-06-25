import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StampSeal } from "@/components/ui/StampSeal";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(247,246,242,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(247,246,242,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      {/* Floating seal — decorative */}
      <div className="absolute -top-10 -right-20 opacity-10 pointer-events-none hidden lg:block">
        <StampSeal size={400} tilt />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-3xl">
          <Badge tone="success" dot className="mb-8">
            Live at Rivers State University
          </Badge>

          <h1 className="text-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-balance">
            Campus tickets.
            <br />
            <span className="text-stamp-orange">Verified at the door.</span>
          </h1>

          <p className="mt-8 max-w-xl text-lg text-stamp-muted leading-relaxed">
            STAMP is how Nigerian student organizers sell tickets, deliver
            them by WhatsApp, and scan them at the gate — without a third party
            running off with the float.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="#pricing">
              <Button size="lg">Start selling tickets</Button>
            </Link>
            <Link href="#how">
              <Button size="lg" variant="secondary">
                How it works
              </Button>
            </Link>
          </div>

          {/* Stat strip */}
          <dl className="mt-16 grid grid-cols-3 gap-4 max-w-lg">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
                Sold to date
              </dt>
              <dd className="text-display text-3xl mt-1">1,200+</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
                Avg. settle
              </dt>
              <dd className="text-display text-3xl mt-1">24h</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
                Fraud rate
              </dt>
              <dd className="text-display text-3xl mt-1">0%</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
