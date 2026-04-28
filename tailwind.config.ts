import type { Config } from "tailwindcss";

const withOpacity = (variableName: string) => `rgb(var(${variableName}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--background"),
        foreground: withOpacity("--foreground"),
        card: withOpacity("--card"),
        "card-foreground": withOpacity("--card-foreground"),
        surface: withOpacity("--surface"),
        "surface-alt": withOpacity("--surface-alt"),
        border: withOpacity("--border"),
        input: withOpacity("--input"),
        ring: withOpacity("--ring"),
        primary: {
          DEFAULT: withOpacity("--primary"),
          strong: withOpacity("--primary-strong"),
          foreground: withOpacity("--primary-foreground"),
        },
        accent: {
          DEFAULT: withOpacity("--accent"),
          strong: withOpacity("--accent-strong"),
          foreground: withOpacity("--accent-foreground"),
        },
        muted: {
          DEFAULT: withOpacity("--muted"),
          foreground: withOpacity("--muted-foreground"),
        },
        success: withOpacity("--success"),
        warning: withOpacity("--warning"),
        danger: withOpacity("--danger"),
        chart: {
          weight: withOpacity("--chart-weight"),
          muscle: withOpacity("--chart-muscle"),
          fat: withOpacity("--chart-fat"),
          "fat-percent": withOpacity("--chart-fat-percent"),
          score: withOpacity("--chart-score"),
          bmr: withOpacity("--chart-bmr"),
          calories: withOpacity("--chart-calories"),
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