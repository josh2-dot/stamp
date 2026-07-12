import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StampSeal } from "@/components/ui/StampSeal";

/**
 * Editorial hero — asymmetric split:
 *   left  ≈ 7/12 (headline, body, CTAs, confidence strip)
 *   right ≈ 5/12 (a rendered ticket stub with the STAMP seal
 *                 imprinted on it — the brand mark in situ)
 *
 * On tablet and below the right column drops beneath the left.
 * The old hero was a centered symmetric block with a background
 * grid; the audit specifically calls that out as generic. This
 * version does the visual work with actual product artefact
 * (a ticket) rather than a decorative grid.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Softer editorial ground — a warm radial wash rather than a
          grid. Sits below the paper grain, above the base cream. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 30% 15%, rgba(192,51,26,0.06), transparent 70%), " +
            "radial-gradient(ellipse 55% 40% at 90% 90%, rgba(166,116,26,0.05), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 lg:pt-28 lg:pb-32">
        <div className="grid lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-8 items-center">
          {/* ============================================================
              Left — the message
              ============================================================ */}
          <div className="lg:col-span-7">
            {/* Location tag as an editorial marker, not a badge pill.
                Reads as "filed from Port Harcourt" — the paper's dateline. */}
            <div className="inline-flex items-center gap-3 mb-6 sm:mb-10">
              <span className="w-6 sm:w-8 h-px bg-stamp-white/40" aria-hidden="true" />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-stamp-muted-2 font-medium">
                Port Harcourt · Established 2026
              </span>
            </div>

            {/* Display headline — display-md on tiny screens, ramps up
                fast. Fraunces has real presence at scale, so we push
                early into the display-lg territory on ≥sm. */}
            <h1 className="font-display text-[2.75rem] xs:text-[3.25rem] sm:text-[4.25rem] lg:text-[5.25rem] leading-[0.95] tracking-[-0.035em] text-stamp-white text-balance">
              Campus tickets,
              <br />
              <span className="italic text-stamp-orange" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1' }}>
                verified
              </span>{" "}
              at the door.
            </h1>

            <p className="mt-6 sm:mt-8 max-w-lg text-base sm:text-lg text-stamp-muted-2 leading-relaxed text-pretty">
              STAMP is how Nigerian student organizers sell tickets,
              deliver them by WhatsApp, and scan them at the gate —
              without a third party running off with the float.
            </p>

            {/* CTA row — stacks full-width on mobile so both actions
                land in the thumb zone. Ghost link inline on ≥sm. */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
              <Link href="#pricing" className="w-full sm:w-auto">
                <Button size="lg" glow fullWidth className="sm:w-auto">
                  Start selling tickets
                </Button>
              </Link>
              <Link
                href="#how"
                className="group inline-flex items-center justify-center sm:justify-start gap-2 text-sm text-stamp-white hover:text-stamp-orange transition-colors py-3.5 min-h-[44px]"
              >
                <span className="border-b border-stamp-white/30 group-hover:border-stamp-orange">
                  See how it works
                </span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            {/* Confidence strip — mobile tightens the padding-left on
                divided items so 375px viewports don't wrap. */}
            <dl className="mt-12 sm:mt-16 grid grid-cols-3 max-w-lg">
              {[
                { label: "Sold to date",    value: "1,247" },
                { label: "Median settle",   value: "~22h" },
                { label: "Disputes",        value: "0 / 1,247" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={i > 0 ? "pl-3 sm:pl-6 border-l border-stamp-border" : ""}
                >
                  <Eyebrow className="text-[10px] sm:text-xs">{stat.label}</Eyebrow>
                  <dd className="font-display print-num text-[1.35rem] sm:text-[1.75rem] text-stamp-white mt-2 sm:mt-2.5 leading-none">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ============================================================
              Right — the artefact
              ============================================================
              A rendered ticket stub. Two panels — the main ticket
              body and the tear-off scan strip — separated by a
              perforated line. Everything's set in the same type
              system so it feels like real production output.
          */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-sm lg:max-w-none">
              <TicketStub />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TicketStub — rendered ticket as hero artefact
// ============================================================
function TicketStub() {
  return (
    <div className="relative -rotate-[2deg] hover:-rotate-[1deg] transition-transform duration-500">
      {/* Warm sepia drop from a fixed light — the ticket sits on paper
          but is slightly lifted, so it casts a soft shadow. */}
      <div
        className="absolute -inset-2 rounded-xl blur-2xl opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(192,51,26,0.15), transparent 60%), " +
            "radial-gradient(ellipse at 70% 70%, rgba(74,68,50,0.3), transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex bg-stamp-surface2 rounded-xl overflow-hidden border border-stamp-border shadow-stamp-card">
        {/* ---- Main body ---- */}
        <div className="flex-1 p-6 relative">
          {/* Corner mark — file number, editorial detail */}
          <div className="flex items-start justify-between mb-8">
            <Eyebrow>Ticket · General</Eyebrow>
            <span className="text-[10px] text-stamp-muted font-mono tracking-tight">
              № 04217
            </span>
          </div>

          <p className="font-display text-[1.4rem] leading-[1.1] text-stamp-white text-balance">
            Lagos Carnival
            <br />
            Pre-game
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-stamp-muted">When</span>
              <span className="text-stamp-white">Fri 12 Jul · 7:00pm</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-stamp-muted">Where</span>
              <span className="text-stamp-white">SUB Field, RSU</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-stamp-muted">Holder</span>
              <span className="text-stamp-white">Adaeze O.</span>
            </div>
          </div>

          {/* Stamped mark — the seal at low opacity, over the ticket
              body. This is the "verified" moment sitting on the paper
              artefact itself. */}
          <div className="mt-8 pt-6 border-t border-dashed border-stamp-border flex items-center justify-between">
            <div>
              <Eyebrow tone="success">Admitted</Eyebrow>
              <p className="text-stamp-white font-display text-[1.05rem] mt-1.5">
                08:42 pm
              </p>
            </div>
            <div className="text-stamp-orange">
              <StampSeal
                size={68}
                tilt
                centerText="ADMIT"
                footerText="GATE 02"
                arcText="ADMIT · GENERAL · "
              />
            </div>
          </div>
        </div>

        {/* ---- Perforation ---- */}
        <div className="relative w-px bg-stamp-border" aria-hidden="true">
          {/* Vertical perforation dots */}
          <div className="absolute inset-y-4 -left-1 w-2 flex flex-col justify-between">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="block w-2 h-2 rounded-full bg-stamp-black" />
            ))}
          </div>
        </div>

        {/* ---- Scan stub ---- */}
        <div className="w-24 sm:w-28 p-3 flex flex-col items-center justify-between bg-stamp-surface">
          {/* Vertical QR label */}
          <span
            className="text-[10px] uppercase tracking-[0.24em] text-stamp-muted font-medium"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Scan · 04217
          </span>
          {/* QR-alike glyph — pure CSS block, no image */}
          <div className="w-16 h-16 grid grid-cols-6 gap-px p-1 bg-stamp-black rounded-sm border border-stamp-border">
            {QR_PATTERN.map((on, i) => (
              <span key={i} className={on ? "bg-stamp-white" : ""} />
            ))}
          </div>
          <span className="text-[9px] text-stamp-muted font-mono">
            stamptickets.ng/t
          </span>
        </div>
      </div>
    </div>
  );
}

/* Static QR-alike pattern — 6x6 = 36 cells. Not a scannable code;
   it's a visual glyph. Real tickets have real UUIDs. */
// prettier-ignore
const QR_PATTERN = [
  1,1,1,0,1,1,
  1,0,1,1,0,1,
  1,1,0,0,1,1,
  0,1,1,1,0,0,
  1,0,1,0,1,1,
  1,1,0,1,1,0,
].map(Boolean);