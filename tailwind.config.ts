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
        background: "#edf4f8",
        foreground: "#10233f",
        card: "#f7fbff",
        border: "#c7d8e6",
        primary: {
          DEFAULT: "#1c365f",
          foreground: "#f7fbff",
        },
        accent: {
          DEFAULT: "#79d7c3",
          foreground: "#10233f",
        },
        muted: {
          DEFAULT: "#dde8f1",
          foreground: "#61758f",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        display: ["var(--font-display)"],
      },
      boxShadow: {
        panel: "0 18px 44px rgba(16, 35, 63, 0.09)",
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