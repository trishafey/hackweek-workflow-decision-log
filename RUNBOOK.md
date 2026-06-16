# Deploy to experiments-projects.com (Cloudflare Pages + D1 + Access)

This app runs as a static SPA **plus** a small API (`/api/state`) backed by a
Cloudflare **D1** database. Auth is handled by **Cloudflare Access** (team login).
Until the backend is live, the app falls back to `localStorage`, so nothing
breaks in the meantime.

Everything below uses the Cloudflare dashboard + `wrangler` CLI. Run CLI steps
from the repo root. (`wrangler` is a dev dependency, or use `npx wrangler`.)

## 0. One-time: sign in
```
npx wrangler login
```

## 1. Create the D1 database
```
npm run db:create        # = wrangler d1 create decision-log
```
Copy the printed `database_id` into **`wrangler.toml`** (replace
`PASTE_DATABASE_ID_HERE`) and commit it.

## 2. Create the table (run the migration)
```
npm run db:migrate              # applies migrations/ to the remote D1
# (local testing instead: npm run db:migrate:local)
```

## 3. Test locally (optional but recommended)
```
npm run pages:dev        # builds, then serves dist + /api with a local D1
```
Open the printed URL; create/edit a log and reload — it should persist.

## 4. Create the Cloudflare Pages project (git-connected)
Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**:
- Repository: this repo
- **Production branch:** `claude/vigilant-volta-jfbytz` (the source branch).
  ⚠️ Do **not** pick `main` — that branch holds the old GitHub Pages *build
  output*, not source. (You can later rename the source branch to `main`.)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
Deploy. Cloudflare auto-detects the `functions/` API.

## 5. Bind D1 to the Pages project
Pages project → **Settings → Functions → D1 database bindings → Add**:
- Variable name: `DB`
- D1 database: `decision-log`
Redeploy (Deployments → Retry/redeploy) so the binding takes effect.

## 6. Custom domain
Pages project → **Custom domains → Set up a custom domain** →
`experiments-projects.com` (and add `www` too if you want). Since DNS is on
Cloudflare, it creates the records automatically. SSL provisions in a few minutes.

## 7. Team login (Cloudflare Access)
Cloudflare **Zero Trust → Access → Applications → Add an application →
Self-hosted**:
- Application domain: `experiments-projects.com`
- Add a **policy**: Action *Allow*, Include → *Emails* (list your teammates)
  or *Emails ending in* `@yourcompany.com`.
- Login methods: Google and/or one-time PIN (email code).
Now only allowed people can reach the site, and the API stamps each save with
the signed-in email (visible later in the DB `updated_by` column).

## How data is stored
The whole workspace (`{ logs, workflows }`) is saved as one JSON document in the
D1 `workspace` table (id `default`). The app loads it on open and saves
(debounced) on change. This is a shared, persistent store for the team.

**Concurrency note (v1):** simultaneous editors are last-write-wins on the shared
document. Fine for a small team editing different things; if you need
conflict-safe concurrent edits, the next step is normalizing into per-entity
tables (`logs`, `entries`, `workflows`) with row-level updates — ask and I'll do it.

## Retiring GitHub Pages
Once Cloudflare is serving the site, you can delete `.github/workflows/deploy.yml`
and turn off GitHub Pages in repo settings, so there's a single source of truth.
