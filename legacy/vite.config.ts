import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // This app now lives in legacy/ and is no longer the hosted site (the root
  // index.html is). Building it is opt-in via `npm run legacy:build`, and the
  // output goes to legacy/dist so it can never be picked up by the deploys,
  // which serve the root build's dist/.
  root: here,
  // Relative base so the build works both at a domain root and under a subpath.
  // Safe because the app uses hash routing, so every page loads the root
  // index.html and relative asset paths resolve.
  base: "./",
  plugins: [react()],
  build: {
    outDir: join(here, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Stable (un-hashed) filenames: a CDN-cached index.html always finds a
        // valid asset, preventing blank pages after frequent redeploys.
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
