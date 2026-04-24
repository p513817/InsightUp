import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f4efe5",
        foreground: "#1d2a24",
        card: "#fffdf7",
        border: "#d3c5ae",
        primary: {
          DEFAULT: "#1f6b52",
          foreground: "#f8f6f0",
        },
        accent: {
          DEFAULT: "#df8f5f",
          foreground: "#1d2a24",
        },
        muted: {
          DEFAULT: "#e6ddd0",
          foreground: "#5c645a",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        display: ["var(--font-display)"],
      },
      boxShadow: {
        panel: "0 24px 80px rgba(54, 39, 18, 0.12)",
      },
      borderRadius: {
        xl: "1.25rem",
        '2xl': "1.75rem",
      },
    },
  },
  plugins: [],
};

export default config;