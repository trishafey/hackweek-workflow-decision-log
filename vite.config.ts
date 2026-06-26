import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works both at the domain root (Cloudflare Worker,
  // experiments-projects.com) and under a subpath (GitHub Pages preview,
  // /hackweek-workflow-decision-log/). Safe because the app uses hash routing,
  // so every page loads the root index.html and relative asset paths resolve.
  base: "./",
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
