import { cn } from "@/lib/cn";

interface StampSealProps {
  className?: string;
  size?: number;
  /** Add the "tilted" feel of a real ink stamp */
  tilt?: boolean;
  /** Use orange instead of currentColor — for the page corners */
  accent?: boolean;
  /** Override the arc text (default: campus brand line) */
  arcText?: string;
  /** Override the center word (default: STAMP) */
  centerText?: string;
  /** Override the footer word (default: VERIFIED) */
  footerText?: string;
}

/**
 * The STAMP brand seal — a circular stamp imprint with arc text
 * around the edge and the wordmark in the center. Inherits color
 * from `currentColor` unless `accent` is set.
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
  // Duplicate the string so we always have coverage.
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
        {/* Counter-clockwise circular path so text reads left-to-right around the top */}
        <path
          id="stamp-arc"
          d="M 50 50 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0"
          fill="none"
        />
      </defs>

      {/* Outer ring */}
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      {/* Inner ring (the text band lives between the two) */}
      <circle
        cx="50"
        cy="50"
        r="33"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      />

      {/* Arc text */}
      <text
        fill="currentColor"
        fontFamily="var(--font-syne), system-ui"
        fontWeight={700}
        fontSize="5.2"
        letterSpacing="1.4"
      >
        <textPath href="#stamp-arc" startOffset="0%">
          {arc}
        </textPath>
      </text>

      {/* Decorative asterisks at 9 o'clock and 3 o'clock */}
      <text
        x="6.5"
        y="52.5"
        fill="currentColor"
        fontSize="4"
        fontFamily="var(--font-syne), system-ui"
      >
        ✦
      </text>
      <text
        x="89"
        y="52.5"
        fill="currentColor"
        fontSize="4"
        fontFamily="var(--font-syne), system-ui"
      >
        ✦
      </text>

      {/* Center word */}
      <text
        x="50"
        y="51"
        textAnchor="middle"
        fontFamily="var(--font-syne), system-ui"
        fontWeight={800}
        fontSize="15"
        letterSpacing="-0.6"
        fill="currentColor"
      >
        {centerText}
      </text>

      {/* Divider line under center word */}
      <line
        x1="35"
        y1="56"
        x2="65"
        y2="56"
        stroke="currentColor"
        strokeWidth="0.7"
      />

      {/* Footer word */}
      <text
        x="50"
        y="64"
        textAnchor="middle"
        fontFamily="var(--font-dm-sans), system-ui"
        fontSize="5"
        letterSpacing="2.5"
        fill="currentColor"
      >
        {footerText}
      </text>
    </svg>
  );
}
