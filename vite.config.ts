import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Absolute base matching the GitHub Pages project subpath so assets resolve
  // regardless of trailing slash: https://<user>.github.io/<repo>/.
  base: "/hackweek-workflow-decision-log/",
  plugins: [react(), cloudflare()],
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