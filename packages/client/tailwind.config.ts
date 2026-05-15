import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        salem: {
          "bg-primary": "#1a1410",
          "bg-secondary": "#2a2118",
          "bg-card": "#f5e6c8",
          "bg-overlay": "rgba(0,0,0,0.7)",
          "text-primary": "#e8d5b5",
          "text-secondary": "#a08b6d",
          "text-dark": "#2a1f14",
          "accent-red": "#c41e3a",
          "accent-green": "#2d6a4f",
          "accent-blue": "#1d3557",
          "accent-black": "#1a1a2e",
          "accent-gold": "#d4a574",
          witch: "#6b1d1d",
          constable: "#1a3a5c",
          townfolk: "#4a6741",
          danger: "#dc3545",
          success: "#28a745",
          warning: "#ffc107",
        },
      },
      fontFamily: {
        heading: ["Cinzel", "Georgia", "serif"],
        body: ["Inter", "PingFang SC", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
        button: "6px",
      },
      boxShadow: {
        card: "0 4px 12px rgba(0,0,0,0.4)",
        glow: "0 0 12px rgba(212,165,116,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
