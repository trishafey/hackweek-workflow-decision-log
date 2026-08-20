// Build step for the static site.
//
// The site is a single self-contained HTML file (index.html) with every asset
// inlined, so "building" is just staging it — plus anything in public/ — into
// dist/, which is what both deploy targets serve:
//   - Cloudflare Worker: wrangler.toml [assets] directory = "./dist"
//   - GitHub Pages: .github/workflows/pages.yml uploads dist/
//
// Note what is NOT copied: legacy/ (the previous Decision Log app) never
// reaches dist/, so it is not served by either target.

import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await cp(join(root, "index.html"), join(dist, "index.html"));
console.log("copied index.html");

if (await exists(join(root, "public"))) {
  await cp(join(root, "public"), dist, { recursive: true });
  console.log("copied public/");
}

console.log("built dist/");
