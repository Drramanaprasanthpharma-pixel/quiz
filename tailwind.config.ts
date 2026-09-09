import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14142B",
          soft: "#1F1D3D",
          faint: "#2B2854",
        },
        paper: {
          DEFAULT: "#FAF9FF",
          dim: "#F0EEFA",
        },
        signal: {
          DEFAULT: "#6C5CE7",
          light: "#8B7CF6",
          dark: "#5241C9",
        },
        mint: {
          DEFAULT: "#00D9B5",
          dark: "#00B598",
        },
        coral: {
          DEFAULT: "#FF5D5D",
          dark: "#E24545",
        },
        gold: {
          DEFAULT: "#FFC93C",
          dark: "#E6AC10",
        },
        ink600: "#4A4770",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      fontSize: {
        stage: ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        tile: "1.25rem",
        panel: "0.75rem",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.9" },
          "70%": { transform: "scale(1.08)", opacity: "0" },
          "100%": { transform: "scale(1.08)", opacity: "0" },
        },
        "count-tick": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        "rise-in": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
        "count-tick": "count-tick 1s ease-in-out infinite",
        "rise-in": "rise-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
