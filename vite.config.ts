import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Absolute base matching the GitHub Pages project subpath so assets resolve
  // regardless of trailing slash: https://<user>.github.io/<repo>/.
  base: "/hackweek-workflow-decision-log/",
  plugins: [react()],
});
