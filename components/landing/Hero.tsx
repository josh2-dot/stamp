import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";

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

      {/* No decorative seal here — DESIGN.md reserves the seal for verification
          moments (ADMIT/DENY, buy-success). Using it as wallpaper kills its impact. */}

      <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-3xl">
          <Badge tone="default" dot className="mb-8">
            Live at Rivers State University
          </Badge>

          {/* Headline carries no brand orange — the CTA below owns that focal cue.
              text-balance wrap helps the two-line layout breathe on tablet. */}
          <h1 className="font-display text-display-lg sm:text-display-xl text-stamp-white text-balance">
            Campus tickets, verified at the door.
          </h1>

          <p className="mt-8 max-w-xl text-base sm:text-lg text-stamp-muted-2 leading-relaxed text-pretty">
            STAMP is how Nigerian student organizers sell tickets, deliver
            them by WhatsApp, and scan them at the gate — without a third party
            running off with the float.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="#pricing">
              <Button size="lg" glow>Start selling tickets</Button>
            </Link>
            <Link href="#how">
              <Button size="lg" variant="secondary">
                How it works
              </Button>
            </Link>
          </div>

          {/* Confidence strip — specific numbers, not round ones. "1,200+" /
              "24h" / "0%" reads as marketing. The exact figures earn trust
              by being awkward. */}
          <dl className="mt-14 grid grid-cols-3 gap-6 max-w-lg border-t border-stamp-border pt-6">
            <div>
              <Eyebrow>Sold to date</Eyebrow>
              <dd className="font-display text-display-xs text-stamp-white mt-1.5 tabular-nums">
                1,247
              </dd>
            </div>
            <div>
              <Eyebrow>Median settle</Eyebrow>
              <dd className="font-display text-display-xs text-stamp-white mt-1.5 tabular-nums">
                ~22h
              </dd>
            </div>
            <div>
              <Eyebrow>Disputes</Eyebrow>
              <dd className="font-display text-display-xs text-stamp-white mt-1.5 tabular-nums">
                0 / 1,247
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
