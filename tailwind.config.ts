import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    // xs breakpoint = 375px (iPhone SE / iPhone 13 mini width). Everything
    // Tailwind ships with starts at sm=640px. xs lets us differentiate
    // the tiny-phone case (Popout wordmark register hiding, etc.) from
    // the "mobile in general" case.
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        // ============================================================
        //  STAMP — "Certified Stub" palette
        //  ------------------------------------------------------------
        //  Cream paper, warm ink, single vermillion accent. Deliberate
        //  pivot away from the dark-navy-plus-neon-orange fingerprint
        //  the old palette shared with every AI-tech dashboard shipped
        //  in 2024. Semantic token names preserved so every downstream
        //  className carries through untouched.
        //
        //  Read as English: "black" = ink, "white" = paper. Same
        //  intent as before — just the actual, physical version.
        // ============================================================
        stamp: {
          // Paper family — warm, slightly desaturated cream.
          // The base is close to unbleached kraft; each step down
          // is a touch more oat / linen.
          black:      "#EDE4CE",   // page background (paper)
          surface:    "#E4DABE",   // cards, panels
          surface2:   "#DACFAF",   // elevated wells, inputs
          border:     "#C9BC97",   // hairline
          // Ink family — warm near-black with olive undertone,
          // reads as fountain-pen ink rather than digital #000.
          white:      "#14100C",   // headlines, body — primary ink
          "muted-2":  "#4A4432",   // secondary body (AA-safe everywhere)
          muted:      "#7A7259",   // eyebrows, decorative meta (12px only)
          // Accents.
          orange:     "#C0331A",   // STAMP vermillion — the one accent
          gold:       "#A6741A",   // deep ochre — warnings, not garnish
          green:      "#2C5B3E",   // forest — gate verification only
          red:        "#7A1F1C",   // bordeaux — errors, destructive
        },
      },
      fontFamily: {
        // Fraunces for display — variable serif with real presence at
        // large sizes. The `opsz` axis pulls in tighter as sizes shrink.
        // Inter Tight for body — clean geometric sans, tighter than
        // stock Inter, keeps its shape on the warm cream ground.
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans:    ["var(--font-inter-tight)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Display scale — tighter tracking on the largest sizes since
        // Fraunces' opsz already opens up at scale. Line-height slightly
        // more generous than Syne because the serifs need breathing room.
        "display-xl": ["4.75rem", { lineHeight: "0.98", letterSpacing: "-0.035em", fontWeight: "500" }],
        "display-lg": ["3.75rem", { lineHeight: "1.00", letterSpacing: "-0.03em",  fontWeight: "500" }],
        "display-md": ["2.625rem",{ lineHeight: "1.05", letterSpacing: "-0.025em", fontWeight: "500" }],
        "display-sm": ["1.875rem",{ lineHeight: "1.15", letterSpacing: "-0.02em",  fontWeight: "500" }],
        "display-xs": ["1.3125rem",{lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "500" }],
      },
      borderRadius: {
        // Four steps — 6/10/16/full. Slightly tighter than the old
        // 8/12/16 set: on cream, generous radii start feeling
        // marshmallowy. Sharper corners read as printed matter.
        sm:      "6px",
        DEFAULT: "6px",
        md:      "6px",
        lg:      "10px",
        xl:      "16px",
      },
      boxShadow: {
        // Warm shadows — tinted with the ink hue instead of pure black.
        // Two-stop: a tight contact shadow + a longer diffuse fall.
        "stamp-card":
          "0 1px 0 rgba(255, 251, 235, 0.6) inset, " +
          "0 1px 2px -1px rgba(74, 68, 50, 0.15), " +
          "0 12px 32px -20px rgba(74, 68, 50, 0.28)",
        // Vermillion halo for the one-per-page glow CTA.
        // The 1px hairline gives buttons a "pressed into paper" feel.
        "stamp-glow":
          "inset 0 -1px 0 rgba(20, 16, 12, 0.25), " +
          "0 0 0 1px rgba(192, 51, 26, 0.35), " +
          "0 14px 32px -14px rgba(192, 51, 26, 0.55)",
        // Deep well — used sparsely on inputs when we want them to feel
        // pressed into the paper rather than laid on top.
        "stamp-well":
          "inset 0 1px 2px rgba(74, 68, 50, 0.14), " +
          "inset 0 0 0 1px rgba(201, 188, 151, 0.6)",
      },
      keyframes: {
        // Preserved from the original — all interactive motion tokens
        // still resolve to the same names. Timing curves unchanged.
        "stamp-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
        "scan-sweep": {
          "0%":   { transform: "translateY(0)" },
          "100%": { transform: "translateY(100%)" },
        },
        "toast-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Projector reveal — kept intact, still snappy.
        "stamp-drop": {
          "0%":   { transform: "translateY(-60vh) scale(1.6) rotate(-18deg)", opacity: "0" },
          "40%":  { transform: "translateY(-10vh) scale(1.3) rotate(-12deg)", opacity: "0.85" },
          "70%":  { transform: "translateY(0)     scale(0.95) rotate(-3deg)", opacity: "1" },
          "85%":  { transform: "translateY(0)     scale(1.05) rotate(-4deg)" },
          "100%": { transform: "translateY(0)     scale(1)    rotate(-3deg)", opacity: "1" },
        },
        "screen-shake": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%":      { transform: "translate(-2px, 1px)" },
          "20%":      { transform: "translate(2px, -1px)" },
          "30%":      { transform: "translate(-1px, -1px)" },
          "40%":      { transform: "translate(1px, 1px)" },
          "50%":      { transform: "translate(0, 0)" },
        },
        "name-rise": {
          "0%":   { opacity: "0", transform: "translateY(24px)", filter: "blur(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)",    filter: "blur(0)" },
        },
        // Ambient glow — was seal orange; now vermillion.
        "seal-ambient": {
          "0%, 100%": { filter: "drop-shadow(0 0 24px rgba(192, 51, 26, 0.18))" },
          "50%":      { filter: "drop-shadow(0 0 48px rgba(192, 51, 26, 0.40))" },
        },
        // Slow paper-drift for the hero backdrop — 60s cycle, so subtle
        // you only notice it if you sit on the page for a while.
        "grain-drift": {
          "0%":   { transform: "translate(0, 0)" },
          "25%":  { transform: "translate(-2%, 1%)" },
          "50%":  { transform: "translate(1%, -2%)" },
          "75%":  { transform: "translate(-1%, -1%)" },
          "100%": { transform: "translate(0, 0)" },
        },
// Bottom-sheet entry — slides up from below the viewport.
        "sheet-in": {
          "0%":   { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        // Desktop modal entry — scale + fade so the sheet doesn't
        // read as an unfinished mobile leftover on wide viewports.
        "modal-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "backdrop-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },      },
      animation: {
        "stamp-pulse":  "stamp-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-sweep":   "scan-sweep 2s ease-in-out infinite alternate",
        "toast-in":     "toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "stamp-drop":   "stamp-drop 900ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "screen-shake": "screen-shake 400ms cubic-bezier(0.4, 0, 0.6, 1) 600ms",
        "name-rise":    "name-rise 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "seal-ambient": "seal-ambient 4s ease-in-out infinite",
        "grain-drift":  "grain-drift 60s ease-in-out infinite",
        "sheet-in":     "sheet-in 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "modal-in":     "modal-in 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "backdrop-in":  "backdrop-in 180ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
