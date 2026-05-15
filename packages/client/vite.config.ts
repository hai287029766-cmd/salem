import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@salem/shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    proxy: {
      "/colyseus": {
        target: "http://localhost:2567",
        ws: true,
      },
      "/api": {
        target: "http://localhost:2567",
      },
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          colyseus: ["colyseus.js"],
          livekit: ["livekit-client"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
