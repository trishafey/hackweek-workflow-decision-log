import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so assets resolve under the GitHub Pages project subpath
  // (e.g. https://<user>.github.io/<repo>/).
  base: "./",
  plugins: [react()],
});
