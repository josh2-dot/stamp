import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stamp: {
          black: "#0A0A14",
          surface: "#14141F",
          surface2: "#1C1C2E",
          border: "#252538",
          orange: "#FF5C1A",
          gold: "#F5C842",
          white: "#F7F6F2",
          muted: "#6B6B8A",
          "muted-2": "#9696B5",
          green: "#2DBD6E",
          red: "#E84040",
        },
      },
      fontFamily: {
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Display scale — pair with `font-display` for the Syne ExtraBold + tracking.
        // Use the responsive prefixes (sm:, lg:) when a headline needs to scale up.
        //   display-xl  → Hero only
        //   display-lg  → Page H1
        //   display-md  → Section H2, primary action moments (e.g. checkout headline)
        //   display-sm  → Card H3, sub-section
        //   display-xs  → Tile H4, kicker
        "display-xl": ["4.5rem", { lineHeight: "0.95", letterSpacing: "-0.025em", fontWeight: "800" }],
        "display-lg": ["3.5rem", { lineHeight: "0.95", letterSpacing: "-0.02em", fontWeight: "800" }],
        "display-md": ["2.5rem", { lineHeight: "1", letterSpacing: "-0.015em", fontWeight: "800" }],
        "display-sm": ["1.75rem", { lineHeight: "1.1", letterSpacing: "-0.01em", fontWeight: "800" }],
        "display-xs": ["1.25rem", { lineHeight: "1.2", letterSpacing: "-0.005em", fontWeight: "800" }],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        "stamp-glow": "0 0 0 1px rgba(255, 92, 26, 0.3), 0 8px 24px -8px rgba(255, 92, 26, 0.4)",
        "stamp-card": "0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 8px 24px -16px rgba(0, 0, 0, 0.6)",
      },
      keyframes: {
        "stamp-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "scan-sweep": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(100%)" },
        },
        // Toast entry — slides up from below + fades in. Short, snappy.
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Projector reveal sequence — promoted from <style jsx global> on the
        // reveal screen so all motion tokens live in one place. Each token
        // matches the original timing curve.
        "stamp-drop": {
          "0%": {
            transform: "translateY(-60vh) scale(1.6) rotate(-18deg)",
            opacity: "0",
          },
          "40%": {
            transform: "translateY(-10vh) scale(1.3) rotate(-12deg)",
            opacity: "0.85",
          },
          "70%": {
            transform: "translateY(0) scale(0.95) rotate(-3deg)",
            opacity: "1",
          },
          "85%": {
            transform: "translateY(0) scale(1.05) rotate(-4deg)",
          },
          "100%": {
            transform: "translateY(0) scale(1) rotate(-3deg)",
            opacity: "1",
          },
        },
        "screen-shake": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-2px, 1px)" },
          "20%": { transform: "translate(2px, -1px)" },
          "30%": { transform: "translate(-1px, -1px)" },
          "40%": { transform: "translate(1px, 1px)" },
          "50%": { transform: "translate(0, 0)" },
        },
        "name-rise": {
          "0%": {
            opacity: "0",
            transform: "translateY(24px)",
            filter: "blur(8px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
            filter: "blur(0)",
          },
        },
        "seal-ambient": {
          "0%, 100%": {
            filter: "drop-shadow(0 0 24px rgba(255, 92, 26, 0.15))",
          },
          "50%": {
            filter: "drop-shadow(0 0 48px rgba(255, 92, 26, 0.35))",
          },
        },
      },
      animation: {
        "stamp-pulse": "stamp-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-sweep": "scan-sweep 2s ease-in-out infinite alternate",
        "toast-in": "toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "stamp-drop": "stamp-drop 900ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "screen-shake": "screen-shake 400ms cubic-bezier(0.4, 0, 0.6, 1) 600ms",
        "name-rise": "name-rise 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "seal-ambient": "seal-ambient 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
