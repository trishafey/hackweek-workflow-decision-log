# Deploy to experiments-projects.com (Cloudflare Worker + D1 + Access)

The app is a single **Cloudflare Worker with static assets**:
- `src/worker.ts` serves `/api/state` (backed by **D1**) and falls back to the
  built SPA in `dist` for everything else.
- Config is `wrangler.toml` (`main`, `[assets]`, and the `DB` D1 binding).
- Deployed via **Workers Builds** (git-connected): build `npm run build`, deploy
  `npx wrangler deploy`.

Until the Worker is live, the app falls back to `localStorage`, so nothing breaks.

## Already done
- D1 database `decision-log` created; `workspace` table created; `database_id`
  is in `wrangler.toml`.
- Worker connected to the repo via Workers Builds (production branch:
  `claude/vigilant-volta-jfbytz`).

## Each deploy (automatic)
Pushing to the production branch runs: `npm run build` → `npx wrangler deploy`.
That uploads the Worker, the `dist` assets, and applies the D1 binding.

Test the bundle locally without deploying:
```
npm run build && npx wrangler deploy --dry-run --outdir /tmp/wout
```
Run the Worker locally (with a local D1):
```
npm run dev:worker     # build + wrangler dev
```

## D1 migrations
The schema lives in `migrations/`. Apply to the remote DB:
```
npm run db:migrate         # wrangler d1 migrations apply decision-log --remote
```
(The initial table was created via the dashboard console; future schema changes
go through `migrations/` + this command.)

## Custom domain
Worker → **Settings → Domains & Routes → Add → Custom domain** →
`experiments-projects.com` (add `www` too if wanted). DNS is on Cloudflare, so
records + SSL are created automatically.

## Team login (Cloudflare Access)
**Zero Trust → Access → Applications → Add → Self-hosted**:
- Application domain: `experiments-projects.com`
- Policy: Action *Allow*, Include → *Emails* (teammates) or *Emails ending in*
  `@yourcompany.com`.
- Login methods: Google and/or one-time PIN.
The Worker reads the signed-in email from `Cf-Access-Authenticated-User-Email`
and stores it in the D1 `updated_by` column on each save.

## How data is stored
The whole workspace (`{ logs, workflows }`) is one JSON document in the D1
`workspace` table (id `default`). The app loads it on open and saves (debounced)
on change — a shared, persistent store for the team.

**Concurrency (v1):** simultaneous editors are last-write-wins on the shared
document. Fine for a small team; if you need conflict-safe concurrent edits, the
next step is normalizing into per-entity tables (`logs`, `entries`, `workflows`).
