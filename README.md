# Wide Awake

The hosted site is a single self-contained page: [`index.html`](index.html). Every
asset (styles, scripts, fonts, images) is inlined, so it needs no build step and
no network requests — opening the file in a browser is enough.

## Run it locally

```bash
npm run dev      # serve the repo root at http://localhost:5173
```

Or just open `index.html` in a browser.

## Build and deploy

```bash
npm run build    # stage index.html + public/ into dist/
npm run preview  # build, then serve dist/ at http://localhost:5173
npm run deploy   # build, then wrangler deploy (Cloudflare)
```

Both deploy targets serve `dist/`:

- **Cloudflare Worker** — `wrangler.toml` points `[assets]` at `./dist`.
- **GitHub Pages** — `.github/workflows/pages.yml` builds and uploads `dist/`
  on every push to `main`.

`scripts/build-static.mjs` copies only the root `index.html` and `public/`.
Nothing under `legacy/` is copied, so nothing there is served.

## The previous site

The Decision Log app that used to be hosted here now lives in
[`legacy/`](legacy/). It is kept in the repo but is no longer built or served —
see [`legacy/README.md`](legacy/README.md) for how to run it.

## Project layout

- `index.html` — the hosted page.
- `public/` — extra files copied into `dist/` as-is (currently `.nojekyll`).
- `scripts/build-static.mjs` — the build (a copy into `dist/`).
- `scripts/serve.mjs` — dependency-free static server for `dev`/`preview`.
- `legacy/` — the previous Decision Log app, unserved.
