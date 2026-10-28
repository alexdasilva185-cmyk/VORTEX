import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // verde principal (troque aqui pra mudar a cor da marca)
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        // Sidebar dark theme (dark navy/charcoal)
        sidebar: {
          DEFAULT: "#0f1729",
          50: "#f5f7fb",
          100: "#e9eef7",
          200: "#cfd8e9",
          300: "#9aaad0",
          400: "#5b6e9c",
          500: "#374a76",
          600: "#243358",
          700: "#1a2542",
          800: "#121a2e",
          900: "#0a1020",
          accent: "#1c2742",
          hover: "#1a2540",
          active: "#10b981",
        },
        ink: {
          50: "#f7f8fa",
          100: "#eef0f4",
          200: "#dde1ea",
          300: "#bcc4d3",
          400: "#8b95aa",
          500: "#5e6a82",
          600: "#3f4a63",
          700: "#2c3447",
          800: "#1a2030",
          900: "#0e121e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
