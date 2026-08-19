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
        pine: {
          900: "#3F5242",
          800: "#465a48",
          700: "#52654f",
          600: "#6D7B5B",
          500: "#7c8a68",
          300: "#a3ad8f",
          100: "#dde3d3",
        },
        khaki: {
          400: "#C8B896",
          300: "#D8C8A8",
          200: "#e6dcc4",
          100: "#F6F1E7",
        },
        brass: {
          700: "#8A6B49",
          500: "#C8A45A",
          300: "#ddc48c",
        },
        rust: {
          600: "#8A6B49",
          500: "#a17f56",
          100: "#e6d8bc",
        },
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
      },
      borderColor: {
        // Bare `border`/`border-t`/etc (no explicit color) fell back to
        // Tailwind's own gray-200 default, which nearly disappears against
        // the warm cream/khaki backgrounds and white cards used everywhere.
        // Give it a warm tone from the palette that's actually visible.
        DEFAULT: "#B8A47E",
      },
      fontFamily: {
        head: ["Bevan", "serif"],
        body: ["'Barlow Semi Condensed'", "sans-serif"],
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