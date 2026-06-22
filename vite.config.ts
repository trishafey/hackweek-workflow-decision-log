import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Served at the domain root by the Cloudflare Worker (experiments-projects.com).
  base: "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Stable (un-hashed) filenames: a CDN-cached index.html always finds a
        // valid asset, preventing blank pages after frequent GitHub Pages redeploys.
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
