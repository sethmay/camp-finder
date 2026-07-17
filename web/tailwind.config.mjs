/** @type {import('tailwindcss').Config} */
// Theme mirrors .claude/handoffs/website_design/tailwind.theme.js + tokens.css (WCAG AA).
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#EDEAE1",
        surface: "#FFFFFF",
        ink: "#20261F",
        muted: "#5C6A5B",
        border: "#D8D3C6",
        primary: { DEFAULT: "#1D5E42", 700: "#164A34" },
        accent: "#B5551F",
        open: { DEFAULT: "#2E7D46", bg: "#E4F0E7", ink: "#1E5B33" },
        waitlist: { DEFAULT: "#8A5A12", bg: "#F6ECD6", ink: "#6F4A10" },
        full: { DEFAULT: "#B23A2E", bg: "#F6E1DE", ink: "#8F2E24" },
        unknown: { bg: "#E8E6DE", ink: "#4A5348" },
      },
      fontFamily: {
        display: ["Libre Franklin", "system-ui", "sans-serif"],
        sans: ["Public Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["40px", { lineHeight: "1.02", letterSpacing: "-0.02em", fontWeight: "800" }],
        h1: ["28px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        h2: ["22px", { lineHeight: "1.2", fontWeight: "700" }],
        h3: ["18px", { lineHeight: "1.3", fontWeight: "700" }],
        body: ["16px", { lineHeight: "1.6" }],
        sm: ["14px", { lineHeight: "1.5" }],
        label: ["12px", { lineHeight: "1.4" }],
      },
      spacing: { 1: "4px", 2: "8px", 3: "12px", 4: "16px", 6: "24px", 8: "32px", 12: "48px" },
      borderRadius: { sm: "6px", md: "10px", lg: "14px", pill: "999px" },
      boxShadow: {
        "sh-1": "0 1px 2px rgba(32,38,31,.08)",
        "sh-2": "0 6px 20px rgba(32,38,31,.14)",
      },
      screens: { sm: "375px", md: "768px", lg: "1280px" },
    },
  },
  plugins: [],
};
