import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Calm, clinical light palette
        background: "#F8FAFC",
        card: "#FFFFFF",
        accent: {
          DEFAULT: "#0D9488", // teal
          fg: "#FFFFFF",
          soft: "#F0FDFA",
        },
        // Semantic
        danger: "#DC2626",
        warn: "#D97706",
        ok: "#16A34A",
        info: "#2563EB",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
