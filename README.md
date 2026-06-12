# Decision Log

A single-page web app for recording product/UX decisions — what was decided, and why — so they aren't re-litigated. Includes filtering, sorting, an add/edit drawer, CSV/JSON export & import, and an optional "populate from notes" AI parser.

Built with [React](https://react.dev), [TypeScript](https://www.typescriptlang.org), and [Vite](https://vite.dev).

## Run it locally

You need [Node.js](https://nodejs.org) (v18 or newer).

```bash
npm install      # install dependencies (first time only)
npm run dev      # start the dev server
```

Then open the printed URL (default http://localhost:5173) in your browser.

## Other commands

```bash
npm run build    # bundle a production build into dist/
npm run preview  # serve the production build locally to check it
```

## Project layout

- `index.html` — the page shell the app mounts into.
- `src/main.tsx` — entry point; renders the app into the page.
- `src/DecisionLogApp.tsx` — the entire Decision Log UI (component + styles).
