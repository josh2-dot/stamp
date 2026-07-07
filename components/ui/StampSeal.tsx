import { cn } from "@/lib/cn";

interface StampSealProps {
  className?: string;
  size?: number;
  /** Adds the "tilted, hand-stamped" pose (-8deg). */
  tilt?: boolean;
  /** Use vermillion instead of currentColor — for accent moments. */
  accent?: boolean;
  /** Override the arc text (default: campus brand line). */
  arcText?: string;
  /** Override the center word (default: STAMP). */
  centerText?: string;
  /** Override the footer word (default: VERIFIED). */
  footerText?: string;
}

/**
 * The STAMP seal — a circular ink stamp with arc text and a wordmark
 * at center. Inherits color from `currentColor` unless `accent` is set.
 *
 * Editorial refresh: added a tick-mark inner ring, replaced the two-star
 * dividers with authentic north/south fleuron marks, and set the whole
 * mark on a slight opacity gradient so the ink "wears" a bit toward
 * the edges — more real, less rendered.
 */
export function StampSeal({
  className,
  size = 96,
  tilt = false,
  accent = false,
  arcText = "CAMPUS TICKETS · RSU · PORT HARCOURT · ",
  centerText = "STAMP",
  footerText = "VERIFIED",
}: StampSealProps) {
  // The arc-text path needs to repeat enough times to fill the circle.
  const arc = (arcText + arcText).slice(0, 70);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(
        accent ? "text-stamp-orange" : "text-current",
        tilt && "-rotate-[8deg]",
        "select-none",
        className,
      )}
    >
      <defs>
        {/* Arc paths — outer for the ring text, inner for tick guides. */}
        <path
          id="stamp-arc"
          d="M 50 50 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0"
          fill="none"
        />
        {/* Slight radial fade so the ink reads worn at the outer edge.
            The center stays crisp — like an ink pad hitting paper. */}
        <radialGradient id="stamp-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="82%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </radialGradient>
        <mask id="stamp-mask">
          <rect width="100" height="100" fill="url(#stamp-fade)" />
        </mask>
      </defs>

      <g mask="url(#stamp-mask)">
        {/* Outer ring — slightly thicker to read at small sizes. */}
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.4" />
        {/* Tick ring — 24 short marks inside the outer band. Purely
            decorative but reads as a bank-note or passport seal detail. */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI * 2;
          const x1 = 50 + Math.cos(angle) * 44;
          const y1 = 50 + Math.sin(angle) * 44;
          const x2 = 50 + Math.cos(angle) * 46;
          const y2 = 50 + Math.sin(angle) * 46;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="currentColor"
              strokeWidth="0.5"
            />
          );
        })}
        {/* Inner ring — text band boundary. */}
        <circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" strokeWidth="0.7" />

        {/* Arc text — Fraunces, letter-spaced, sized for the ring. */}
        <text
          fill="currentColor"
          fontFamily="var(--font-fraunces), serif"
          fontWeight={600}
          fontSize="5.4"
          letterSpacing="1.4"
        >
          <textPath href="#stamp-arc" startOffset="0%">
            {arc}
          </textPath>
        </text>

        {/* North/south fleurons — subtler than the previous stars. */}
        <text
          x="50" y="16" textAnchor="middle"
          fill="currentColor" fontSize="4.5"
          fontFamily="serif"
        >
          ✦
        </text>
        <text
          x="50" y="90" textAnchor="middle"
          fill="currentColor" fontSize="4.5"
          fontFamily="serif"
        >
          ✦
        </text>

        {/* Center word — Fraunces at heavy weight, tightly kerned. */}
        <text
          x="50" y="51"
          textAnchor="middle"
          fontFamily="var(--font-fraunces), serif"
          fontWeight={600}
          fontSize="15"
          letterSpacing="-0.8"
          fill="currentColor"
        >
          {centerText}
        </text>

        {/* Divider — three little strokes instead of one long line. */}
        <g stroke="currentColor" strokeWidth="0.7">
          <line x1="40" y1="56" x2="44" y2="56" />
          <line x1="47" y1="56" x2="53" y2="56" />
          <line x1="56" y1="56" x2="60" y2="56" />
        </g>

        {/* Footer word — Inter Tight, small, wider tracking. */}
        <text
          x="50" y="64"
          textAnchor="middle"
          fontFamily="var(--font-inter-tight), sans-serif"
          fontSize="4.8"
          letterSpacing="2.4"
          fontWeight={600}
          fill="currentColor"
        >
          {footerText}
        </text>
      </g>
    </svg>
  );
}
