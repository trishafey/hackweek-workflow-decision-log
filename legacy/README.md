# Decision Log (archived)

> **Archived.** This app is no longer the hosted site — the root
> [`index.html`](../index.html) is. The source is kept here for reference and
> is not copied into `dist/`, so neither the Cloudflare Worker nor GitHub Pages
> serves it. It still builds and runs on demand with the commands below.

A single-page web app for recording product/UX decisions — what was decided, and why — so they aren't re-litigated. Includes filtering, sorting, an add/edit drawer, CSV/JSON export & import, and an optional "populate from notes" AI parser.

Built with [React](https://react.dev), [TypeScript](https://www.typescriptlang.org), and [Vite](https://vite.dev).

## Run it locally

You need [Node.js](https://nodejs.org) (v18 or newer).

```bash
npm install      # install dependencies (first time only)
npm run legacy:dev    # start the dev server
```

Then open the printed URL (default http://localhost:5173) in your browser.

## Other commands

```bash
npm run legacy:build  # bundle a production build into legacy/dist/
```

## Project layout

- `legacy/index.html` — the page shell the app mounts into.
- `legacy/src/main.tsx` — entry point; renders the app into the page.
- `legacy/src/DecisionLogApp.tsx` — the entire Decision Log UI (component + styles).
