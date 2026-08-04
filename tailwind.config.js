/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Rangers Academy palette (dark forest green / sage / cream / khaki / brass gold)
        forest: {
          950: "#0F241D",
          900: "#16302A",
          800: "#1E4536",
          700: "#27594A",
          600: "#336B58",
        },
        sage: {
          50: "#F1F3EE",
          100: "#E2E7DA",
          300: "#A9BC97",
          500: "#7C8F6E",
          600: "#6E8060",
          700: "#576650",
        },
        cream: {
          DEFAULT: "#F5F1E4",
          50: "#FBF9F2",
          100: "#F5F1E4",
          200: "#EFE9D8",
        },
        khaki: {
          DEFAULT: "#C9B896",
          light: "#E4DCC4",
          dark: "#A9955F",
        },
        brass: {
          DEFAULT: "#B8892B",
          light: "#D4A94A",
          dim: "#8C6A22",
        },
        // The codebase has ~23 files using the default Tailwind grayscale
        // ("slate-*") for neutral text/borders/backgrounds. Rather than
        // hand-edit every className, we override the built-in `slate` scale
        // itself so every existing bg-slate-100 / text-slate-800 / etc.
        // picks up Rangers-palette tones automatically, while preserving the
        // original light->dark ordering (and therefore contrast behavior)
        // each usage already relied on.
        slate: {
          50: "#F6F2E4",
          100: "#EAE1C4",
          200: "#D8CBA0",
          300: "#C2AF7C",
          400: "#8A9678",
          500: "#5C6B54",
          600: "#46543F",
          700: "#2C4033",
          800: "#1E3329",
          900: "#142219",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}