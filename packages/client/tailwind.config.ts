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
          "bg-dark": "#0c0907",
          "bg-parchment": "#1c1612",
          "bg-card-dark": "#181410",
          "bg-card-folded": "#14100c",
          "text-primary": "#e8d5b5",
          "text-secondary": "#a08b6d",
          "text-dark": "#2a1f14",
          "text-bright": "#e8ddd0",
          "text-ink": "#8a7a6a",
          "accent-red": "#c41e3a",
          "accent-green": "#2d6a4f",
          "accent-blue": "#1d3557",
          "accent-black": "#1a1a2e",
          "accent-gold": "#b8943f",
          "accent-gold-light": "#d4a574",
          "accent-wax": "#8b1a1a",
          "accent-wax-bright": "#a82020",
          "accent-rope": "#6b4e2a",
          "accent-rope-knot": "#a07040",
          witch: "#6b1d1d",
          "witch-mark": "#5a3060",
          constable: "#1a3a5c",
          townfolk: "#4a6741",
          "villager-mark": "#3a5060",
          danger: "#dc3545",
          success: "#28a745",
          warning: "#ffc107",
        },
      },
      fontFamily: {
        heading: ["Cinzel", "Georgia", "serif"],
        body: ["Noto Serif SC", "IM Fell English", "Inter", "PingFang SC", "serif"],
      },
      borderRadius: {
        card: "12px",
        button: "6px",
      },
      boxShadow: {
        card: "0 4px 12px rgba(0,0,0,0.4)",
        glow: "0 0 12px rgba(184,148,63,0.3)",
        "glow-strong": "0 0 16px rgba(184,148,63,0.5)",
        wax: "0 2px 8px rgba(139,26,26,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
