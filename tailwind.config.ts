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
          green: "#2DBD6E",
          red: "#E84040",
        },
      },
      fontFamily: {
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
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
      },
      animation: {
        "stamp-pulse": "stamp-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-sweep": "scan-sweep 2s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
