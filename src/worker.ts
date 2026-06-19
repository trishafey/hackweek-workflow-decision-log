// Cloudflare Worker entry: serves the /api routes (backed by D1) and falls back
// to the static SPA assets for everything else.
//
// Bindings (see wrangler.toml):
//   DB      -> D1 database "decision-log"
//   ASSETS  -> static assets built into ./dist

interface Env {
  DB: any;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const WORKSPACE_ID = "default";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Cloudflare Access puts the signed-in user's email in this header.
const userEmail = (request: Request) =>
  request.headers.get("cf-access-authenticated-user-email") || null;

async function handleState(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT data, version, updated_at, updated_by FROM workspace WHERE id = ?"
    ).bind(WORKSPACE_ID).first();
    if (!row) return json({ logs: null, workflows: null, version: 0 });
    let parsed: any = {};
    try { parsed = JSON.parse(row.data); } catch { parsed = {}; }
    return json({
      logs: parsed.logs ?? null,
      workflows: parsed.workflows ?? null,
      version: row.version,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    });
  }

  if (request.method === "PUT") {
    let body: any;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const data = JSON.stringify({ logs: body.logs ?? [], workflows: body.workflows ?? [] });
    const now = new Date().toISOString();
    const email = userEmail(request);
    await env.DB.prepare(
      `INSERT INTO workspace (id, data, version, updated_at, updated_by)
         VALUES (?1, ?2, 1, ?3, ?4)
       ON CONFLICT(id) DO UPDATE SET
         data = ?2, version = version + 1, updated_at = ?3, updated_by = ?4`
    ).bind(WORKSPACE_ID, data, now, email).run();
    const row = await env.DB.prepare("SELECT version FROM workspace WHERE id = ?")
      .bind(WORKSPACE_ID).first();
    return json({ ok: true, version: row?.version ?? 1, updatedAt: now, updatedBy: email });
  }

  return json({ error: "Method not allowed" }, 405);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/state") return handleState(request, env);
    // Everything else: serve the built SPA (assets + single-page-app fallback).
    return env.ASSETS.fetch(request);
  },
};
